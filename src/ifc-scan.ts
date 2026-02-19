// src/ifc-scan.ts
import {
  IfcAPI,
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCRELDEFINESBYPROPERTIES,
  IFCPROPERTYSET,
  IFCPROPERTYSINGLEVALUE,
} from "web-ifc";

export type WallScanResult = {
  expressID: number;      // expressID del muro (IfcWall)
  artPieza: string;       // valor real (≠ 0)
};

function toStringValue(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v?.value === "string") return v.value;
  if (typeof v?.value === "number") return String(v.value);
  return "";
}

function isEmptyForApp(s: string): boolean {
  const t = (s ?? "").trim();
  return t === "" || t === "0";
}

function vecToArray(vec: any): number[] {
  const out: number[] = [];
  for (let i = 0; i < vec.size(); i++) out.push(vec.get(i));
  return out;
}

// Normaliza listas que pueden venir como vector web-ifc o array JS
function refsToIds(refs: any): number[] {
  if (!refs) return [];

  // vector-like
  if (typeof refs.size === "function" && typeof refs.get === "function") {
    const out: number[] = [];
    for (let i = 0; i < refs.size(); i++) {
      const r = refs.get(i);
      const id = typeof r === "number" ? r : r?.value;
      if (typeof id === "number") out.push(id);
    }
    return out;
  }

  // array-like
  if (Array.isArray(refs)) {
    return refs
      .map((r) => (typeof r === "number" ? r : r?.value))
      .filter((id) => typeof id === "number") as number[];
  }

  return [];
}

/**
 * ✅ Escaneo robusto SIN depender de inversos (IsDefinedBy)
 * Busca IfcRelDefinesByProperties -> Pset -> ART_Pieza -> RelatedObjects (muros)
 */
export async function scanWallsWithValues(
  ifcBytes: Uint8Array,
  wasmPath: string,
): Promise<WallScanResult[]> {
  const api = new IfcAPI();
  api.SetWasmPath(wasmPath, true);
  await api.Init();

  const modelID = api.OpenModel(ifcBytes);

  // 1) IDs de relaciones IfcRelDefinesByProperties
  const relIds = vecToArray(api.GetLineIDsWithType(modelID, IFCRELDEFINESBYPROPERTIES));

  // Para filtrar rápido muros:
  const wallIds = new Set<number>(vecToArray(api.GetLineIDsWithType(modelID, IFCWALL)));
  const wallStdIds = new Set<number>(vecToArray(api.GetLineIDsWithType(modelID, IFCWALLSTANDARDCASE)));

  const resultsMap = new Map<number, string>(); // wallExpressId -> artPieza

  for (const relId of relIds) {
    const rel = api.GetLine(modelID, relId) as any;
    if (!rel) continue;

    // 2) Ir al property set
    const psetRef = rel?.RelatingPropertyDefinition;
    const psetId = typeof psetRef === "number" ? psetRef : psetRef?.value;
    if (!psetId) continue;

    const pset = api.GetLine(modelID, psetId) as any;
    if (!pset || pset.type !== IFCPROPERTYSET) continue;

    // 3) Buscar ART_Pieza dentro del Pset
    let artPieza = "";
    const propIds = refsToIds(pset?.HasProperties);

    for (const propId of propIds) {
      const prop = api.GetLine(modelID, propId) as any;
      if (!prop || prop.type !== IFCPROPERTYSINGLEVALUE) continue;

      const propName = toStringValue(prop?.Name);
      if (propName !== "ART_Pieza") continue;

      artPieza = toStringValue(prop?.NominalValue);
      break;
    }

    if (isEmptyForApp(artPieza)) continue; // solo valores reales

    // 4) Aplicar ese ART_Pieza a los objetos relacionados (RelatedObjects)
    const relatedIds = refsToIds(rel?.RelatedObjects);

    for (const objId of relatedIds) {
      // quedarnos solo con muros
      if (!wallIds.has(objId) && !wallStdIds.has(objId)) continue;
      resultsMap.set(objId, artPieza);
    }
  }

  api.CloseModel(modelID);

  return [...resultsMap.entries()].map(([expressID, artPieza]) => ({
    expressID,
    artPieza,
  }));
}
