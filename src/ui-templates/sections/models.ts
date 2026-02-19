// // src/ui-templates/sections/models.ts

// import * as BUI from "@thatopen/ui";
// import * as CUI from "@thatopen/ui-obc";
// import * as OBC from "@thatopen/components";
// import * as OBF from "@thatopen/components-front";
// import * as FRAGS from "@thatopen/fragments";

// import { appIcons } from "../../globals";
// import { ifcStore } from "../../ifc-store";
// import { scanWallsWithValues } from "../../ifc-scan";

// import * as THREE from "three";
// import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// /** -----------------------------
//  *  Module-level UI state
//  *  ----------------------------- */
// let updateModelsPanel: (() => void) | null = null;

// let modelsList: any = null;
// let modelsListInited = false;

// let hasWallsWithValues = false;

// // Labels toggle
// let showWallLabelsActive = false;
// let wallLabelObjects: CSS2DObject[] = [];

// // Highlight toggle
// let highlightWallsActive = false;
// const WALLS_HIGHLIGHT_STYLE_ID = "walls-with-artpieza";

// // Model tracking
// let lastIfcModelId: string | null = null;

// // Walls found on scan
// let wallsWithArtPieza: Array<{ expressID: number; artPieza: string }> = [];

// /** -----------------------------
//  *  Helpers
//  *  ----------------------------- */
// function isEmptyForApp(v: string) {
//   const t = (v ?? "").trim();
//   return t === "" || t === "0";
// }

// function buildArtPiezaCounts(items: Array<{ artPieza: string }>) {
//   const map = new Map<string, number>();

//   for (const it of items) {
//     const key = String(it.artPieza ?? "").trim();
//     if (key === "" || key === "0") continue;
//     map.set(key, (map.get(key) ?? 0) + 1);
//   }

//   return [...map.entries()]
//     .map(([artPieza, count]) => ({ artPieza, count }))
//     .sort((a, b) => b.count - a.count || a.artPieza.localeCompare(b.artPieza));
// }

// function logArtPiezaReportToConsole(modelName: string, rows: Array<{ artPieza: string; count: number }>) {
//   console.group(`[ART_PIEZA REPORT] ${modelName}`);
//   console.table(rows);
//   const total = rows.reduce((acc, r) => acc + r.count, 0);
//   console.log("Total muros con ART_Pieza válido:", total);
//   console.groupEnd();
// }

// /**
//  * ✅ Evita importar world desde main.ts (ciclos).
//  * Sacamos el world "Main" (o el primero disponible) desde components.
//  */
// function getMainWorld(components: OBC.Components): any | null {
//   const worlds: any = components.get(OBC.Worlds);

//   // Varios nombres posibles según versión
//   const byName =
//     worlds?.list?.get?.("Main") ??
//     worlds?.worlds?.get?.("Main") ??
//     worlds?.get?.("Main");

//   if (byName) return byName;

//   // Fallback: primer world creado
//   const first =
//     worlds?.list?.values?.().next?.().value ??
//     worlds?.worlds?.values?.().next?.().value;

//   return first ?? null;
// }

// function createHtmlLabel(text: string, position: THREE.Vector3) {
//   const div = document.createElement("div");
//   div.className = "pieza-label";
//   div.textContent = text;

//   // Estilo (puedes moverlo a CSS)
//   div.style.background = "rgba(0,0,0,0.7)";
//   div.style.color = "white";
//   div.style.padding = "4px 8px";
//   div.style.borderRadius = "6px";
//   div.style.fontSize = "12px";
//   div.style.fontWeight = "bold";
//   div.style.whiteSpace = "nowrap";
//   div.style.pointerEvents = "none";

//   const label = new CSS2DObject(div);
//   label.position.copy(position);

//   return label;
// }

// function clearWallLabels() {
//   for (const obj of wallLabelObjects) {
//     obj.parent?.remove(obj);
//   }
//   wallLabelObjects = [];
// }

// async function createWallLabels(components: OBC.Components) {
//   clearWallLabels();
//   if (!lastIfcModelId) return;
//   if (!wallsWithArtPieza.length) return;

//   const world = getMainWorld(components);
//   if (!world?.scene?.three) return;

//   const fragments = components.get(OBC.FragmentsManager);
//   const model: any = (fragments.list as any).get(lastIfcModelId);
//   if (!model?.object) return;

//   for (const w of wallsWithArtPieza) {
//     const id = w.expressID;

//     let box: any = null;

//     try {
//       // En tu runtime, getBoxes espera Set([id])
//       if (typeof model.getBoxes === "function") {
//         const boxes = await model.getBoxes(new Set([id]));
//         box = Array.isArray(boxes) ? boxes[0] : boxes;
//       } else if (typeof model.getMergedBox === "function") {
//         box = await model.getMergedBox(new Set([id]));
//       }
//     } catch {
//       box = null;
//     }

//     if (!box || typeof box.getCenter !== "function") continue;

//     const center = new THREE.Vector3();
//     box.getCenter(center);

//     const size = new THREE.Vector3();
//     box.getSize(size);

//     // offset pequeño (ajústalo si quieres)
//     const offsetY = THREE.MathUtils.clamp(size.y * 0.08, 0.03, 0.25);
//     center.y += offsetY;

//     const label = createHtmlLabel(w.artPieza, center);

//     // ✅ Añadimos al scene del world (estable)
//     world.scene.three.add(label);
//     wallLabelObjects.push(label);
//   }
// }

// /**
//  * ✅ HIGHLIGHT: usa el MISMO patrón que tu toolbar:
//  * highlighter.styles.set + highlighter.highlightByID
//  */
// function buildSelectionForWalls(model: any) {
//   const ids = new Set<number>(wallsWithArtPieza.map((w) => w.expressID));

//   // ModelIdMap requerido por highlightByID
//   const selection: any = {};
//   selection[model.modelId] = ids;

//   return selection;
// }

// async function applyWallsHighlight(components: OBC.Components) {
//   if (!lastIfcModelId) return;
//   if (!wallsWithArtPieza.length) return;

//   const fragments = components.get(OBC.FragmentsManager);
//   const model: any = (fragments.list as any).get(lastIfcModelId);
//   if (!model) return;

//   const highlighter = components.get(OBF.Highlighter);

//   // estilo propio (no toca "select")
//   highlighter.styles.set(WALLS_HIGHLIGHT_STYLE_ID, {
//     color: new THREE.Color("#ff6a00"),
//     renderedFaces: FRAGS.RenderedFaces.ONE,
//     opacity: 1,
//     transparent: false,
//   });

//   const selection = buildSelectionForWalls(model);
//   await highlighter.highlightByID(WALLS_HIGHLIGHT_STYLE_ID, selection, false, false);
// }

// async function clearWallsHighlight(components: OBC.Components) {
//   const highlighter = components.get(OBF.Highlighter);
//   await highlighter.clear(WALLS_HIGHLIGHT_STYLE_ID);
// }

// /** -----------------------------
//  *  Template
//  *  ----------------------------- */
// export interface ModelsPanelState {
//   components: OBC.Components;
// }

// export const modelsPanelTemplate: BUI.StatefullComponent<ModelsPanelState> = (
//   state,
//   update,
// ) => {
//   const { components } = state;
//   updateModelsPanel = update;

//   const ifcLoader = components.get(OBC.IfcLoader);
//   const fragments = components.get(OBC.FragmentsManager);

//   if (!modelsListInited) {
//     [modelsList] = CUI.tables.modelsList({
//       components,
//       actions: { download: false },
//     });
//     modelsListInited = true;
//   }

//   const onSearch = (e: Event) => {
//     const input = e.target as BUI.TextInput;
//     modelsList.queryString = input.value;
//   };

//   const onShowWallLabels = async () => {
//     if (!hasWallsWithValues) return;

//     showWallLabelsActive = !showWallLabelsActive;

//     if (showWallLabelsActive) {
//       await createWallLabels(components);
//     } else {
//       clearWallLabels();
//     }

//     updateModelsPanel?.();
//   };

//   const onToggleWallHighlight = async () => {
//     if (!hasWallsWithValues) return;

//     highlightWallsActive = !highlightWallsActive;

//     if (highlightWallsActive) {
//       await applyWallsHighlight(components);
//     } else {
//       await clearWallsHighlight(components);
//     }

//     updateModelsPanel?.();
//   };

//   const onAddIfcModel = async ({ target }: { target: BUI.Button }) => {
//     const input = document.createElement("input");
//     input.type = "file";
//     input.multiple = false;
//     input.accept = ".ifc";

//     input.addEventListener("change", async () => {
//       const file = input.files?.[0];
//       if (!file) return;

//       target.loading = true;

//       const buffer = await file.arrayBuffer();
//       const bytes = new Uint8Array(buffer);
//       const name = file.name.replace(".ifc", "");

//       ifcStore.reset(bytes, name);
//       await ifcLoader.load(bytes, true, name);

//       // Capturamos el último modelId cargado
//       try {
//         const keys = [...(fragments.list as any).keys()];
//         lastIfcModelId = (keys.at(-1) ?? null) as any;
//         const report = buildArtPiezaCounts(
//   wallsWithArtPieza.map(w => ({ artPieza: w.artPieza }))
// );

// logArtPiezaReportToConsole(name, report);

//       } catch {
//         lastIfcModelId = null;
//       }

//       try {
//         const wasmPath = `${import.meta.env.BASE_URL}web-ifc/`;
//         const found = await scanWallsWithValues(bytes, wasmPath);

//         wallsWithArtPieza = found
//           .map((r: any) => ({ expressID: r.expressID, artPieza: String(r.artPieza) }))
//           .filter((w) => !isEmptyForApp(w.artPieza));

//         hasWallsWithValues = wallsWithArtPieza.length > 0;

//         // Reset UI state
//         showWallLabelsActive = false;
//         clearWallLabels();

//         highlightWallsActive = false;
//         await clearWallsHighlight(components);

//         updateModelsPanel?.();

//         console.log(`[IFC] Loaded: ${name}`);
//       } catch (e) {
//         console.warn("IFC scan failed:", e);

//         hasWallsWithValues = false;
//         wallsWithArtPieza = [];

//         showWallLabelsActive = false;
//         clearWallLabels();

//         highlightWallsActive = false;
//         await clearWallsHighlight(components);

//         updateModelsPanel?.();
//       }

//       target.loading = false;
//       BUI.ContextMenu.removeMenus();
//     });

//     input.addEventListener("cancel", () => (target.loading = false));
//     input.click();
//   };

//   const onAddFragmentsModel = async ({ target }: { target: BUI.Button }) => {
//     const input = document.createElement("input");
//     input.type = "file";
//     input.multiple = false;
//     input.accept = ".frag";

//     input.addEventListener("change", async () => {
//       const file = input.files?.[0];
//       if (!file) return;

//       target.loading = true;

//       const buffer = await file.arrayBuffer();
//       const bytes = new Uint8Array(buffer);

//       await fragments.core.load(bytes, {
//         modelId: file.name.replace(".frag", ""),
//       });

//       target.loading = false;
//       BUI.ContextMenu.removeMenus();
//     });

//     input.addEventListener("cancel", () => (target.loading = false));
//     input.click();
//   };

//   return BUI.html`
//     <bim-panel-section fixed icon=${appIcons.MODEL} label="Models">
//       <div style="display:flex; gap:0.5rem; align-items:center;">
//         <bim-text-input
//           @input=${onSearch}
//           vertical
//           placeholder="Search..."
//           debounce="200"
//           style="flex: 1;"
//         ></bim-text-input>

//         ${hasWallsWithValues
//           ? BUI.html`
//               <bim-button
//                 id="show-wall-labels-btn"
//                 style="flex:0;"
//                 icon=${showWallLabelsActive ? "mdi:label" : "mdi:label-outline"}
//                 ?active=${showWallLabelsActive}
//                 @click=${onShowWallLabels}
//                 tooltip-title=${showWallLabelsActive ? "Ocultar etiquetas" : "Mostrar etiquetas"}
//                 tooltip-text="Muestra ART_Pieza sobre los muros que ya tienen valor."
//               ></bim-button>

//               <bim-button
//                 id="highlight-walls-btn"
//                 style="flex:0;"
//                 icon=${highlightWallsActive ? "mdi:palette" : "mdi:palette-outline"}
//                 ?active=${highlightWallsActive}
//                 @click=${onToggleWallHighlight}
//                 tooltip-title=${highlightWallsActive ? "Quitar color" : "Colorear muros"}
//                 tooltip-text="Paneles nombrados"
//               ></bim-button>
//             `
//           : null}

//         <bim-button style="flex:0;" icon=${appIcons.ADD}>
//           <bim-context-menu style="gap: 0.25rem;">
//             <bim-button label="IFC" @click=${onAddIfcModel}></bim-button>
//             <bim-button label="Fragments" @click=${onAddFragmentsModel}></bim-button>
//           </bim-context-menu>
//         </bim-button>
//       </div>

//       ${modelsList}
//     </bim-panel-section>
//   `;
// };





































// import * as BUI from "@thatopen/ui";
// import * as CUI from "@thatopen/ui-obc";
// import * as OBC from "@thatopen/components";
// import * as OBF from "@thatopen/components-front";
// import * as FRAGS from "@thatopen/fragments";

// import { appIcons } from "../../globals";
// import { ifcStore } from "../../ifc-store";
// import { scanWallsWithValues } from "../../ifc-scan";
// import { setArtPiezaReport } from "../../art-pieza-report-store";

// import * as THREE from "three";
// import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// /* --------------------------------------------------
//    STATE
// -------------------------------------------------- */

// let updateModelsPanel: (() => void) | null = null;

// let modelsList: any = null;
// let modelsListInited = false;

// let hasWallsWithValues = false;

// let showWallLabelsActive = false;
// let highlightWallsActive = false;

// let lastIfcModelId: string | null = null;

// let wallsWithArtPieza: Array<{ expressID: number; artPieza: string }> = [];

// let wallLabelObjects: CSS2DObject[] = [];

// const WALLS_HIGHLIGHT_STYLE_ID = "walls-with-artpieza";

// /* --------------------------------------------------
//    HELPERS
// -------------------------------------------------- */

// function isEmptyForApp(v: string) {
//   const t = (v ?? "").trim();
//   return t === "" || t === "0";
// }

// function buildArtPiezaCounts(items: Array<{ artPieza: string }>) {
//   const map = new Map<string, number>();

//   for (const it of items) {
//     const key = String(it.artPieza ?? "").trim();
//     if (key === "" || key === "0") continue;
//     map.set(key, (map.get(key) ?? 0) + 1);
//   }

//   return [...map.entries()]
//     .map(([artPieza, count]) => ({ artPieza, count }))
//     .sort((a, b) => b.count - a.count || a.artPieza.localeCompare(b.artPieza));
// }

// function logArtPiezaReportToConsole(
//   modelName: string,
//   rows: Array<{ artPieza: string; count: number }>
// ) {
//   console.group(`[ART_PIEZA REPORT] ${modelName}`);
//   console.table(rows);
//   const total = rows.reduce((acc, r) => acc + r.count, 0);
//   console.log("Total muros con ART_Pieza válido:", total);
//   console.groupEnd();
// }

// function getMainWorld(components: OBC.Components): any | null {
//   const worlds: any = components.get(OBC.Worlds);
//   return (
//     worlds?.list?.get?.("Main") ??
//     worlds?.list?.values?.().next?.().value ??
//     null
//   );
// }

// /* --------------------------------------------------
//    LABELS
// -------------------------------------------------- */

// function createHtmlLabel(text: string, position: THREE.Vector3) {
//   const div = document.createElement("div");
//   div.textContent = text;

//   div.style.background = "rgba(0,0,0,0.7)";
//   div.style.color = "white";
//   div.style.padding = "4px 8px";
//   div.style.borderRadius = "6px";
//   div.style.fontSize = "12px";
//   div.style.fontWeight = "bold";
//   div.style.whiteSpace = "nowrap";
//   div.style.pointerEvents = "none";

//   const label = new CSS2DObject(div);
//   label.position.copy(position);

//   return label;
// }

// function clearWallLabels() {
//   for (const obj of wallLabelObjects) {
//     obj.parent?.remove(obj);
//   }
//   wallLabelObjects = [];
// }

// async function createWallLabels(components: OBC.Components) {
//   clearWallLabels();
//   if (!lastIfcModelId) return;
//   if (!wallsWithArtPieza.length) return;

//   const world = getMainWorld(components);
//   if (!world?.scene?.three) return;

//   const fragments = components.get(OBC.FragmentsManager);
//   const model: any = fragments.list.get(lastIfcModelId);
//   if (!model?.object) return;

//   for (const w of wallsWithArtPieza) {
//     let box: any = null;

//     try {
//       const boxes = await model.getBoxes(new Set([w.expressID]));
//       box = Array.isArray(boxes) ? boxes[0] : boxes;
//     } catch {
//       continue;
//     }

//     if (!box?.getCenter) continue;

//     const center = new THREE.Vector3();
//     box.getCenter(center);

//     const size = new THREE.Vector3();
//     box.getSize(size);

//     const offsetY = THREE.MathUtils.clamp(size.y * 0.08, 0.03, 0.25);
//     center.y += offsetY;

//     const label = createHtmlLabel(w.artPieza, center);
//     world.scene.three.add(label);
//     wallLabelObjects.push(label);
//   }
// }

// /* --------------------------------------------------
//    HIGHLIGHT
// -------------------------------------------------- */

// function buildSelectionForWalls(model: any) {
//   const ids = new Set<number>(wallsWithArtPieza.map(w => w.expressID));
//   const selection: any = {};
//   selection[model.modelId] = ids;
//   return selection;
// }

// async function applyWallsHighlight(components: OBC.Components) {
//   if (!lastIfcModelId) return;
//   if (!wallsWithArtPieza.length) return;

//   const fragments = components.get(OBC.FragmentsManager);
//   const model: any = fragments.list.get(lastIfcModelId);
//   if (!model) return;

//   const highlighter = components.get(OBF.Highlighter);

//   highlighter.styles.set(WALLS_HIGHLIGHT_STYLE_ID, {
//     color: new THREE.Color("#ff6a00"),
//     renderedFaces: FRAGS.RenderedFaces.ONE,
//     opacity: 1,
//     transparent: false,
//   });

//   const selection = buildSelectionForWalls(model);
//   await highlighter.highlightByID(
//     WALLS_HIGHLIGHT_STYLE_ID,
//     selection,
//     false,
//     false
//   );
// }

// async function clearWallsHighlight(components: OBC.Components) {
//   const highlighter = components.get(OBF.Highlighter);
//   await highlighter.clear(WALLS_HIGHLIGHT_STYLE_ID);
// }

// /* --------------------------------------------------
//    TEMPLATE
// -------------------------------------------------- */

// export interface ModelsPanelState {
//   components: OBC.Components;
// }

// export const modelsPanelTemplate: BUI.StatefullComponent<ModelsPanelState> =
// (state, update) => {

//   const { components } = state;
//   updateModelsPanel = update;

//   const ifcLoader = components.get(OBC.IfcLoader);
//   const fragments = components.get(OBC.FragmentsManager);

//   if (!modelsListInited) {
//     [modelsList] = CUI.tables.modelsList({
//       components,
//       actions: { download: false },
//     });
//     modelsListInited = true;
//   }

//   const onAddIfcModel = async ({ target }: { target: BUI.Button }) => {
//     const input = document.createElement("input");
//     input.type = "file";
//     input.accept = ".ifc";

//     input.addEventListener("change", async () => {
//       const file = input.files?.[0];
//       if (!file) return;

//       target.loading = true;

//       const buffer = await file.arrayBuffer();
//       const bytes = new Uint8Array(buffer);
//       const name = file.name.replace(".ifc", "");

//       ifcStore.reset(bytes, name);
//       await ifcLoader.load(bytes, true, name);

//       try {
//         const keys = [...fragments.list.keys()];
//         lastIfcModelId = keys.at(-1) ?? null;
//       } catch {
//         lastIfcModelId = null;
//       }

//       try {
//         const wasmPath = `${import.meta.env.BASE_URL}web-ifc/`;
//         const found = await scanWallsWithValues(bytes, wasmPath);

//         wallsWithArtPieza = found
//           .map((r: any) => ({
//             expressID: r.expressID,
//             artPieza: String(r.artPieza),
//           }))
//           .filter(w => !isEmptyForApp(w.artPieza));

//         hasWallsWithValues = wallsWithArtPieza.length > 0;

//         const report = buildArtPiezaCounts(
//           wallsWithArtPieza.map(w => ({ artPieza: w.artPieza }))
//         );

//         logArtPiezaReportToConsole(name, report);

//         // 🔥 ESTA ES LA CLAVE PARA EL PANEL
//         setArtPiezaReport(report);

//       } catch (e) {
//         console.warn("IFC scan failed:", e);
//         hasWallsWithValues = false;
//         wallsWithArtPieza = [];
//         setArtPiezaReport([]);
//       }

//       showWallLabelsActive = false;
//       highlightWallsActive = false;
//       clearWallLabels();
//       await clearWallsHighlight(components);

//       updateModelsPanel?.();

//       target.loading = false;
//       BUI.ContextMenu.removeMenus();
//     });

//     input.click();
//   };

//   return BUI.html`
//     <bim-panel-section fixed icon=${appIcons.MODEL} label="Models">
//       <div style="display:flex; gap:0.5rem; align-items:center;">
//         <bim-button style="flex:0;" icon=${appIcons.ADD}>
//           <bim-context-menu>
//             <bim-button label="IFC" @click=${onAddIfcModel}></bim-button>
//           </bim-context-menu>
//         </bim-button>
//       </div>
//       ${modelsList}
//     </bim-panel-section>
//   `;
// };



import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";

import { appIcons } from "../../globals";
import { ifcStore } from "../../ifc-store";
import { scanWallsWithValues } from "../../ifc-scan";
import { setArtPiezaReport } from "../../art-pieza-report-store";

import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/** -----------------------------
 *  Module-level UI state
 *  ----------------------------- */
let updateModelsPanel: (() => void) | null = null;

let modelsList: any = null;
let modelsListInited = false;

let hasWallsWithValues = false;

// Labels toggle
let showWallLabelsActive = false;
let wallLabelObjects: CSS2DObject[] = [];
let hideWallsActive = false;

// Highlight toggle
let highlightWallsActive = false;
const WALLS_HIGHLIGHT_STYLE_ID = "walls-with-artpieza";

// Model tracking
let lastIfcModelId: string | null = null;

// Walls found on scan
let wallsWithArtPieza: Array<{ expressID: number; artPieza: string }> = [];

/** -----------------------------
 *  Helpers
 *  ----------------------------- */
function isEmptyForApp(v: string) {
  const t = (v ?? "").trim();
  return t === "" || t === "0";
}

function buildArtPiezaCounts(items: Array<{ artPieza: string }>) {
  const map = new Map<string, number>();

  for (const it of items) {
    const key = String(it.artPieza ?? "").trim();
    if (key === "" || key === "0") continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

return [...map.entries()]
  .map(([artPieza, count]) => ({ artPieza, count }))
  .sort((a, b) =>
    a.artPieza.localeCompare(b.artPieza, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function logArtPiezaReportToConsole(
  modelName: string,
  rows: Array<{ artPieza: string; count: number }>,
) {
  console.group(`[ART_PIEZA REPORT] ${modelName}`);
  console.table(rows);
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  console.log("Total muros con ART_Pieza válido:", total);
  console.groupEnd();
}

export async function onArtPiezaApplied(
  
  components: OBC.Components,
  payload:
    | { expressID: number; artPieza: string }
    | Array<{ expressID: number; artPieza: string }>,
) {
  console.log("[onArtPiezaApplied]", payload);
  const updates = Array.isArray(payload) ? payload : [payload];

  // 1) Actualiza cache wallsWithArtPieza (upsert/remove)
  const map = new Map<number, string>();
  for (const w of wallsWithArtPieza) map.set(w.expressID, w.artPieza);

  for (const u of updates) {
    const v = String(u.artPieza ?? "");
    if (isEmptyForApp(v)) {
      map.delete(u.expressID);
    } else {
      map.set(u.expressID, v.trim());
    }
  }

  wallsWithArtPieza = [...map.entries()].map(([expressID, artPieza]) => ({
    expressID,
    artPieza,
  }));
  hasWallsWithValues = wallsWithArtPieza.length > 0;

  // 2) Recalcula reporte y publícalo
  const report = buildArtPiezaCounts(
    wallsWithArtPieza.map((w) => ({ artPieza: w.artPieza })),
  );
  setArtPiezaReport(report);

  // 3) Refresca lo visible si hay toggles activos
  if (showWallLabelsActive) {
    await createWallLabels(components);
  }

  if (highlightWallsActive) {
    await clearWallsHighlight(components);
    await applyWallsHighlight(components);
  }

  if (hideWallsActive) {
    await clearWallsHide(components);
    await applyWallsHide(components);
  }

  updateModelsPanel?.();
}


/**
 * ✅ Evita importar world desde main.ts (ciclos).
 * Sacamos el world "Main" (o el primero disponible) desde components.
 */
function getMainWorld(components: OBC.Components): any | null {
  const worlds: any = components.get(OBC.Worlds);

  const byName =
    worlds?.list?.get?.("Main") ??
    worlds?.worlds?.get?.("Main") ??
    worlds?.get?.("Main");

  if (byName) return byName;

  const first =
    worlds?.list?.values?.().next?.().value ??
    worlds?.worlds?.values?.().next?.().value;

  return first ?? null;
}

/** -----------------------------
 *  Labels
 *  ----------------------------- */
function createHtmlLabel(text: string, position: THREE.Vector3) {
  const div = document.createElement("div");
  div.className = "pieza-label";
  div.textContent = text;

  // Estilo (si quieres, muévelo a CSS)
  div.style.background = "rgba(0,0,0,0.7)";
  div.style.color = "white";
  div.style.padding = "4px 8px";
  div.style.borderRadius = "6px";
  div.style.fontSize = "12px";
  div.style.fontWeight = "bold";
  div.style.whiteSpace = "nowrap";
  div.style.pointerEvents = "none";

  const label = new CSS2DObject(div);
  label.position.copy(position);

  return label;
}

function clearWallLabels() {
  for (const obj of wallLabelObjects) {
    obj.parent?.remove(obj);
  }
  wallLabelObjects = [];
}

async function createWallLabels(components: OBC.Components) {
  clearWallLabels();
  if (!lastIfcModelId) return;
  if (!wallsWithArtPieza.length) return;

  const world = getMainWorld(components);
  if (!world?.scene?.three) return;

  const fragments = components.get(OBC.FragmentsManager);
  const model: any = (fragments.list as any).get(lastIfcModelId);
  if (!model?.object) return;

  for (const w of wallsWithArtPieza) {
    const id = w.expressID;

    let box: any = null;

    try {
      // En algunos runtimes: getBoxes(Set([id])) o getMergedBox(Set([id]))
      if (typeof model.getBoxes === "function") {
        const boxes = await model.getBoxes(new Set([id]));
        box = Array.isArray(boxes) ? boxes[0] : boxes;
      } else if (typeof model.getMergedBox === "function") {
        box = await model.getMergedBox(new Set([id]));
      }
    } catch {
      box = null;
    }

    if (!box || typeof box.getCenter !== "function") continue;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    // offset pequeño (ajústalo si quieres)
    const offsetY = THREE.MathUtils.clamp(size.y * 0.08, 0.03, 0.25);
    center.y += offsetY;

    const label = createHtmlLabel(w.artPieza, center);

    // ✅ Añadimos al scene del world (estable)
    world.scene.three.add(label);
    wallLabelObjects.push(label);
  }
}

/** -----------------------------
 *  Highlight
 *  ----------------------------- */
async function applyWallsHide(components: OBC.Components) {
  if (!lastIfcModelId) return;
  if (!wallsWithArtPieza.length) return;

  const fragments = components.get(OBC.FragmentsManager);
  const model: any = (fragments.list as any).get(lastIfcModelId);
  if (!model) return;

  const hider = components.get(OBC.Hider);

  const selection = buildSelectionForWalls(model); // mismo ModelIdMap
  await hider.set(false, selection); // ocultar solo esos muros
}

async function clearWallsHide(components: OBC.Components) {
  if (!lastIfcModelId) return;
  if (!wallsWithArtPieza.length) return;

  const fragments = components.get(OBC.FragmentsManager);
  const model: any = (fragments.list as any).get(lastIfcModelId);
  if (!model) return;

  const hider = components.get(OBC.Hider);

  const selection = buildSelectionForWalls(model);
  await hider.set(true, selection); // volver a mostrar solo esos muros
}


function buildSelectionForWalls(model: any) {
  const ids = new Set<number>(wallsWithArtPieza.map((w) => w.expressID));

  // ModelIdMap requerido por highlightByID
  const selection: any = {};
  selection[model.modelId] = ids;

  return selection;
}

async function applyWallsHighlight(components: OBC.Components) {
  if (!lastIfcModelId) return;
  if (!wallsWithArtPieza.length) return;

  const fragments = components.get(OBC.FragmentsManager);
  const model: any = (fragments.list as any).get(lastIfcModelId);
  if (!model) return;

  const highlighter = components.get(OBF.Highlighter);

  // estilo propio (no toca "select")
  highlighter.styles.set(WALLS_HIGHLIGHT_STYLE_ID, {
    color: new THREE.Color("#ff6a00"),
    renderedFaces: FRAGS.RenderedFaces.ONE,
    opacity: 1,
    transparent: false,
  });

  const selection = buildSelectionForWalls(model);
  await highlighter.highlightByID(WALLS_HIGHLIGHT_STYLE_ID, selection, false, false);
}

async function clearWallsHighlight(components: OBC.Components) {
  const highlighter = components.get(OBF.Highlighter);
  await highlighter.clear(WALLS_HIGHLIGHT_STYLE_ID);
}

/** -----------------------------
 *  Template
 *  ----------------------------- */
export interface ModelsPanelState {
  components: OBC.Components;
}

export const modelsPanelTemplate: BUI.StatefullComponent<ModelsPanelState> = (
  state,
  update,
) => {
  const { components } = state;
  updateModelsPanel = update;

  const ifcLoader = components.get(OBC.IfcLoader);
  const fragments = components.get(OBC.FragmentsManager);

  if (!modelsListInited) {
    [modelsList] = CUI.tables.modelsList({
      components,
      actions: { download: false },
    });
    modelsListInited = true;
  }

  const onSearch = (e: Event) => {
    const input = e.target as BUI.TextInput;
    modelsList.queryString = input.value;
  };

  const onShowWallLabels = async () => {
    if (!hasWallsWithValues) return;

    showWallLabelsActive = !showWallLabelsActive;

    if (showWallLabelsActive) {
      await createWallLabels(components);
    } else {
      clearWallLabels();
    }

    updateModelsPanel?.();
  };

  const onToggleWallHighlight = async () => {
    if (!hasWallsWithValues) return;

    highlightWallsActive = !highlightWallsActive;

    if (highlightWallsActive) {
      await applyWallsHighlight(components);
    } else {
      await clearWallsHighlight(components);
    }

    updateModelsPanel?.();
  };

  const onToggleWallHide = async () => {
  if (!hasWallsWithValues) return;

  hideWallsActive = !hideWallsActive;

  if (hideWallsActive) {
    await applyWallsHide(components);
  } else {
    await clearWallsHide(components);
  }

  updateModelsPanel?.();
};

  const resetUiToggles = async () => {
    showWallLabelsActive = false;
    clearWallLabels();

    highlightWallsActive = false;
    await clearWallsHighlight(components);
    hideWallsActive = false;
await clearWallsHide(components);

  };

const onAddIfcModel = async ({ target }: { target: BUI.Button }) => {
  const supportsFS =
    "showOpenFilePicker" in window &&
    typeof (window as any).showOpenFilePicker === "function";

  target.loading = true;

  try {
    let file: File | null = null;
    let fileHandle: FileSystemFileHandle | null = null;

    if (supportsFS) {
      // ✅ esto ocurre DIRECTO en el click del botón (user gesture)
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "IFC",
            accept: {
              "application/octet-stream": [".ifc"],
              "model/ifc": [".ifc"],
            },
          },
        ],
      });

      fileHandle = handle;
      file = await handle.getFile();
    } else {
      // fallback: input clásico
      file = await new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = false;
        input.accept = ".ifc";
        input.addEventListener(
          "change",
          () => resolve(input.files?.[0] ?? null),
          { once: true },
        );
        input.click();
      });
    }

    if (!file) return;

    // --- A PARTIR DE AQUÍ: tu lógica existente, igual que antes ---
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // nombre base sin .ifc y sin timestamp final
    const rawName = file.name.replace(/\.ifc$/i, "");
    const name = rawName.replace(/_\d{8}_\d{6}$/, "");

    ifcStore.reset(bytes, name, fileHandle);
    await ifcLoader.load(bytes, true, name);

    // Capturamos el último modelId cargado
    try {
      const keys = [...(fragments.list as any).keys()];
      lastIfcModelId = (keys.at(-1) ?? null) as any;
    } catch {
      lastIfcModelId = null;
    }

    // Scan + preparar muros + report
    try {
      const wasmPath = `${import.meta.env.BASE_URL}web-ifc/`;
      const found = await scanWallsWithValues(bytes, wasmPath);

      wallsWithArtPieza = found
        .map((r: any) => ({
          expressID: r.expressID,
          artPieza: String(r.artPieza),
        }))
        .filter((w) => !isEmptyForApp(w.artPieza));

      hasWallsWithValues = wallsWithArtPieza.length > 0;

      const report = buildArtPiezaCounts(
        wallsWithArtPieza.map((w) => ({ artPieza: w.artPieza })),
      );

      logArtPiezaReportToConsole(name, report);
      setArtPiezaReport(report);
    } catch (e) {
      console.warn("IFC scan failed:", e);

      hasWallsWithValues = false;
      wallsWithArtPieza = [];
      setArtPiezaReport([]);
    }

    await resetUiToggles();
    updateModelsPanel?.();
    console.log(`[IFC] Loaded: ${name}`);
  } finally {
    target.loading = false;
    BUI.ContextMenu.removeMenus();
  }
};


  const onAddFragmentsModel = async ({ target }: { target: BUI.Button }) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = ".frag";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;

      target.loading = true;

      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        await fragments.core.load(bytes, {
          modelId: file.name.replace(/\.frag$/i, ""),
        });

        // Al cargar fragments no sabemos si hay scan, así que limpiamos panel de reporte
        // (si prefieres mantener el último reporte, elimina esta línea)
        setArtPiezaReport([]);

        await resetUiToggles();
        updateModelsPanel?.();
      } finally {
        target.loading = false;
        BUI.ContextMenu.removeMenus();
      }
    });

    input.addEventListener("cancel", () => (target.loading = false));
    input.click();
  };

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.MODEL} label="Models">
      <div style="display:flex; gap:0.5rem; align-items:center;">


        ${hasWallsWithValues
          ? BUI.html`
              <bim-button
                id="show-wall-labels-btn"
                style="flex:0;"
                icon=${showWallLabelsActive ? "mdi:label" : "mdi:label-outline"}
                ?active=${showWallLabelsActive}
                @click=${onShowWallLabels}
                tooltip-title=${showWallLabelsActive ? "Ocultar etiquetas" : "Mostrar etiquetas"}
                tooltip-text="Muestra ART_Pieza sobre los muros que ya tienen valor."
              ></bim-button>

              <bim-button
                id="highlight-walls-btn"
                style="flex:0;"
                icon=${highlightWallsActive ? "mdi:palette" : "mdi:palette-outline"}
                ?active=${highlightWallsActive}
                @click=${onToggleWallHighlight}
                tooltip-title=${highlightWallsActive ? "Quitar color" : "Colorear muros"}
                tooltip-text="Resalta los muros con ART_Pieza."
              ></bim-button>
              <bim-button
  id="hide-walls-btn"
  style="flex:0;"
  icon=${hideWallsActive ? "mdi:eye-off" : "mdi:eye"}
  ?active=${hideWallsActive}
  @click=${onToggleWallHide}
  tooltip-title=${hideWallsActive ? "Mostrar muros" : "Ocultar muros"}
  tooltip-text="Oculta los muros que tienen ART_Pieza."
></bim-button>

            `
          : null}

<bim-button
  style="flex:0;"
  label="IFC"
  @click=${onAddIfcModel}
  tooltip-title="Cargar IFC"
  tooltip-text="Abre un archivo IFC."
></bim-button>

      </div>

      ${modelsList}
    </bim-panel-section>
  `;
};
