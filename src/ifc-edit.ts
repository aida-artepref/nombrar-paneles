import * as OBC from "@thatopen/components";
import {
  IFCRELDEFINESBYPROPERTIES,
  IFCPROPERTYSET,
  IFCPROPERTYSINGLEVALUE,
  IFCLABEL,
} from "web-ifc";

type IfcPrimitive = string | number | boolean;

/* =========================================================
   Helpers
========================================================= */

function vectorToArray(vec: any): any[] {
  if (!vec) return [];
  const out: any[] = [];
  const size = typeof vec.size === "function" ? vec.size() : 0;
  for (let i = 0; i < size; i++) out.push(vec.get(i));
  return out;
}

/**
 * Normaliza referencias:
 * - number
 * - { value: number }
 * - { expressID: number }
 */
function getId(ref: any): number | null {
  if (ref == null) return null;
  if (typeof ref === "number" && Number.isFinite(ref)) return ref;
  if (typeof ref?.value === "number" && Number.isFinite(ref.value)) return ref.value;
  if (typeof ref?.expressID === "number" && Number.isFinite(ref.expressID)) return ref.expressID;
  return null;
}

function toStringValue(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v?.value === "string") return v.value;
  if (typeof v?.value === "number") return String(v.value);
  return String(v ?? "");
}

function idsFromRelatedObjects(related: any): number[] {
  if (!related) return [];

  // Vector WASM
  if (typeof related.size === "function" && typeof related.get === "function") {
    const out: number[] = [];
    const n = related.size();
    for (let i = 0; i < n; i++) {
      const id = getId(related.get(i));
      if (id != null) out.push(id);
    }
    return out;
  }

  // Array JS
  if (Array.isArray(related)) {
    return related.map(getId).filter((x): x is number => x != null);
  }

  // array-like
  if (typeof related.length === "number") {
    const out: number[] = [];
    for (let i = 0; i < related.length; i++) {
      const id = getId(related[i]);
      if (id != null) out.push(id);
    }
    return out;
  }

  return [];
}

/* =========================================================
   Resolver expressID de ART_Pieza (robusto)
========================================================= */

export async function getSingleValuePropertyExpressIdByElementId(params: {
  components: OBC.Components;
  ifcBytes: Uint8Array;
  elementExpressID: number;
  expectedPropName: string; // "ART_Pieza"
}): Promise<number | null> {
  const { components, ifcBytes, elementExpressID, expectedPropName } = params;

  const ifcLoader = components.get(OBC.IfcLoader);
  const modelID = await ifcLoader.readIfcFile(ifcBytes);

  try {
    const webIfc = ifcLoader.webIfc;

    // 1) Leer el elemento
    const element = webIfc.GetLine(modelID, elementExpressID, true) as any;
    if (!element) return null;

    // ---- A) Intento rápido: IsDefinedBy (como tu ifc-scan.ts) ----
    const isDefinedBy = element?.IsDefinedBy;
    if (isDefinedBy && typeof isDefinedBy.size === "function") {
      for (let i = 0; i < isDefinedBy.size(); i++) {
        const relRef = isDefinedBy.get(i);
        const relId = getId(relRef);
        if (!relId) continue;

        const rel = webIfc.GetLine(modelID, relId, true) as any;
        if (!rel || rel.type !== IFCRELDEFINESBYPROPERTIES) continue;

        const psetId = getId(rel?.RelatingPropertyDefinition);
        if (!psetId) continue;

        const pset = webIfc.GetLine(modelID, psetId, true) as any;
        if (!pset || pset.type !== IFCPROPERTYSET) continue;

        const hasProps = pset?.HasProperties;
        if (!hasProps || typeof hasProps.size !== "function") continue;

        for (let j = 0; j < hasProps.size(); j++) {
          const propId = getId(hasProps.get(j));
          if (!propId) continue;

          const prop = webIfc.GetLine(modelID, propId, true) as any;
          if (!prop || prop.type !== IFCPROPERTYSINGLEVALUE) continue;

          const propName = toStringValue(prop?.Name);
          if (propName === expectedPropName) return propId;
        }
      }
    }

    // ---- B) Fallback: scan forward usando constantes importadas de web-ifc ----
    const relIds = vectorToArray(
      webIfc.GetLineIDsWithType(modelID, IFCRELDEFINESBYPROPERTIES, true)
    )
      .map((x) => getId(x))
      .filter((x): x is number => x != null);

    for (const relId of relIds) {
      const rel = webIfc.GetLine(modelID, relId, true) as any;
      if (!rel) continue;

      const relatedIds = idsFromRelatedObjects(rel?.RelatedObjects);
      if (!relatedIds.includes(elementExpressID)) continue;

      const psetId = getId(rel?.RelatingPropertyDefinition);
      if (!psetId) continue;

      const pset = webIfc.GetLine(modelID, psetId, true) as any;
      if (!pset || pset.type !== IFCPROPERTYSET) continue;

      const hasProps = pset?.HasProperties;
      const propsList =
        typeof hasProps?.size === "function" && typeof hasProps?.get === "function"
          ? vectorToArray(hasProps)
          : Array.isArray(hasProps)
            ? hasProps
            : [];

      for (const ph of propsList) {
        const pid = getId(ph);
        if (!pid) continue;

        const prop = webIfc.GetLine(modelID, pid, true) as any;
        if (!prop || prop.type !== IFCPROPERTYSINGLEVALUE) continue;

        const propName = toStringValue(prop?.Name);
        if (propName === expectedPropName) return pid;
      }
    }

    return null;
  } finally {
    ifcLoader.webIfc.CloseModel(modelID);
  }
}

/* =========================================================
   Leer NominalValue por nombre de propiedad
========================================================= */

export async function getSingleValuePropertyNominalValueByElementId(params: {
  components: OBC.Components;
  ifcBytes: Uint8Array;
  elementExpressID: number;
  propName: string; // "ART_Pieza"
}): Promise<string | null> {
  const { components, ifcBytes, elementExpressID, propName } = params;

  const propId = await getSingleValuePropertyExpressIdByElementId({
    components,
    ifcBytes,
    elementExpressID,
    expectedPropName: propName,
  });

  if (!propId) return null;

  const ifcLoader = components.get(OBC.IfcLoader);
  const modelID = await ifcLoader.readIfcFile(ifcBytes);

  try {
    const webIfc = ifcLoader.webIfc;
    const prop = webIfc.GetLine(modelID, propId, true) as any;
    if (!prop) return null;

    return toStringValue(prop?.NominalValue);
  } finally {
    ifcLoader.webIfc.CloseModel(modelID);
  }
}

/* =========================================================
   Escribir NominalValue por expressID de la propiedad
========================================================= */

export async function setPropertySingleValueNominalValueById(params: {
  components: OBC.Components;
  ifcBytes: Uint8Array;
  propertyExpressID: number;
  expectedPropName: string; // "ART_Pieza"
  newValue: IfcPrimitive;
}): Promise<Uint8Array> {
  const { components, ifcBytes, propertyExpressID, expectedPropName, newValue } = params;

  const ifcLoader = components.get(OBC.IfcLoader);
  const modelID = await ifcLoader.readIfcFile(ifcBytes);

  try {
    const webIfc = ifcLoader.webIfc;

    const prop = webIfc.GetLine(modelID, propertyExpressID, true) as any;
    if (!prop) throw new Error(`No pude leer la propiedad #${propertyExpressID}.`);

    const name = toStringValue(prop?.Name);
    if (name !== expectedPropName) {
      throw new Error(`#${propertyExpressID} no corresponde a "${expectedPropName}" (Name="${name}").`);
    }

    const nextStr = String(newValue);

    if (prop.NominalValue && typeof prop.NominalValue === "object") {
      prop.NominalValue.value = nextStr;
    } else {
      // si no hay wrapper, creamos como IFCLABEL
      prop.NominalValue = { type: IFCLABEL, value: nextStr };
    }

    webIfc.WriteLine(modelID, prop);
    return webIfc.SaveModel(modelID);
  } finally {
    ifcLoader.webIfc.CloseModel(modelID);
  }
}

/* =========================================================
   Escribir NominalValue + Name del elemento
========================================================= */

export async function setPropertySingleValueNominalValueAndElementNameById(params: {
  components: OBC.Components;
  ifcBytes: Uint8Array;
  propertyExpressID: number;
  expectedPropName: string;
  elementExpressID: number;
  newValue: IfcPrimitive;
}): Promise<Uint8Array> {
  const {
    components,
    ifcBytes,
    propertyExpressID,
    expectedPropName,
    elementExpressID,
    newValue,
  } = params;

  const ifcLoader = components.get(OBC.IfcLoader);
  const modelID = await ifcLoader.readIfcFile(ifcBytes);

  try {
    const webIfc = ifcLoader.webIfc;

    // 1) actualiza propiedad
    const prop = webIfc.GetLine(modelID, propertyExpressID, true) as any;
    if (!prop) throw new Error(`No pude leer la propiedad #${propertyExpressID}.`);

    const propName = toStringValue(prop?.Name);
    if (propName !== expectedPropName) {
      throw new Error(`#${propertyExpressID} no corresponde a "${expectedPropName}" (Name="${propName}").`);
    }

    const nextStr = String(newValue);

    if (!prop?.NominalValue) {
      prop.NominalValue = { type: IFCLABEL, value: nextStr };
    } else if (typeof prop.NominalValue === "object") {
      prop.NominalValue.value = nextStr;
      if (typeof prop.NominalValue.type !== "number") prop.NominalValue.type = IFCLABEL;
    } else {
      prop.NominalValue = { type: IFCLABEL, value: nextStr };
    }

    webIfc.WriteLine(modelID, prop);

    // 2) actualiza Name del elemento
    const element = webIfc.GetLine(modelID, elementExpressID, true) as any;
    if (!element) throw new Error(`No pude leer el elemento #${elementExpressID}.`);

    if (element.Name && typeof element.Name === "object") {
      element.Name.value = nextStr;
      if (typeof element.Name.type !== "number") element.Name.type = IFCLABEL;
    } else {
      element.Name = { type: IFCLABEL, value: nextStr };
    }

    webIfc.WriteLine(modelID, element);

    return webIfc.SaveModel(modelID);
  } finally {
    ifcLoader.webIfc.CloseModel(modelID);
  }
}
