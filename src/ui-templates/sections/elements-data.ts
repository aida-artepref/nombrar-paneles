// import * as BUI from "@thatopen/ui";
// import * as CUI from "@thatopen/ui-obc";
// import * as OBC from "@thatopen/components";
// import * as OBF from "@thatopen/components-front";
// import { appIcons } from "../../globals";

// import { ifcStore } from "../../ifc-store";
// import {
//   setPropertySingleValueNominalValueAndElementNameById,
//   getSingleValuePropertyExpressIdByElementId,
//   getSingleValuePropertyNominalValueByElementId,
// } from "../../ifc-edit";
// import { onArtPiezaApplied } from "./models";

// export interface ElementsDataPanelState {
//   components: OBC.Components;
// }

// const PROP_NAME = "ART_Pieza";

// /** =========
//  *  Module-level singletons (persist across rerenders)
//  *  ========= */
// let initialized = false;
// let updatePanel: (() => void) | null = null;

// let propsTable: any = null;
// let updatePropsTable: ((args: any) => void) | null = null;

// let componentsRef: OBC.Components | null = null;

// /** Selection + UI state */
// let lastModelIdMap: { [key: string]: Set<number> } = {};
// let isWallSelected = false;
// let panelValue = "";

// /** Inline editing state */
// let editingKey: string | null = null;
// let editingValue = "";

// /**
//  * expressIDs of IfcPropertySingleValue for ART_Pieza
//  * (collected while rendering the property tree, only for inline edit)
//  */
// const targetPropLocalIds = new Set<number>();

// /** Cache robusto: expressID de ART_Pieza por elemento seleccionado */
// const propIdByElement = new Map<string, number>(); // `${modelId}:${elementId}`

// /**
//  * Para no “romper” nada, invalidamos cache si cambia el objeto bytes
//  * (tu pipeline reasigna ifcStore.bytes = newBytes)
//  */
// let lastIfcBytesRef: Uint8Array | null = null;
// const invalidateCachesIfIfcChanged = () => {
//   if (ifcStore.bytes && ifcStore.bytes !== lastIfcBytesRef) {
//     lastIfcBytesRef = ifcStore.bytes;

//     // Cache de prop IDs puede quedar desalineado si el modelo cambia
//     propIdByElement.clear();

//     // Esto solo afecta al inline edit y se repuebla al renderizar
//     targetPropLocalIds.clear();
//   }
// };

// const getCurrentSelection = () => {
//   const modelId = Object.keys(lastModelIdMap)[0];
//   const elementId = modelId ? [...lastModelIdMap[modelId]][0] : null;
//   return { modelId, elementId };
// };

// const downloadIfc = (bytes: Uint8Array, filename: string) => {
//   const safeBytes = new Uint8Array(bytes);
//   const blob = new Blob([safeBytes], { type: "application/octet-stream" });

//   const a = document.createElement("a");
//   a.href = URL.createObjectURL(blob);
//   a.download = filename;
//   a.click();
//   URL.revokeObjectURL(a.href);
// };

// const onDownload = () => {
//   if (!ifcStore.bytes) return;

//   downloadIfc(ifcStore.bytes, `${ifcStore.name ?? "model"}-edited.ifc`);

//   ifcStore.dirty = false;
//   updatePanel?.();
// };

// const refreshTable = () => {
//   if (!updatePropsTable) return;
//   updatePropsTable({ modelIdMap: lastModelIdMap });
// };

// /**
//  * Resuelve el expressID de la propiedad ART_Pieza para el elemento seleccionado.
//  * NO depende de expandir árbol.
//  */
// async function resolvePropIdForSelection(): Promise<number | null> {
//   invalidateCachesIfIfcChanged();
//   if (!componentsRef || !ifcStore.bytes) return null;

//   const { modelId, elementId } = getCurrentSelection();
//   if (!modelId || elementId == null) return null;

//   const key = `${modelId}:${elementId}`;
//   const cached = propIdByElement.get(key);
//   if (cached) return cached;

//   try {
//     const propId = await getSingleValuePropertyExpressIdByElementId({
//       components: componentsRef,
//       ifcBytes: ifcStore.bytes,
//       elementExpressID: Number(elementId),
//       expectedPropName: PROP_NAME,
//     });

//     if (propId) propIdByElement.set(key, propId);

//     // Log útil si falla (no rompe nada)
//     if (!propId) {
//       // Esto ayuda a detectar si elementId NO es realmente el expressID del IFC
//       console.warn(
//         `[elements-data] No se pudo resolver ${PROP_NAME}. selection elementId=${elementId} modelKey=${modelId}. ` +
//           `Si el IFC lo tiene (#68294 en tu ejemplo), revisa getSingleValuePropertyExpressIdByElementId o el ID de selección.`
//       );
//     }

//     return propId ?? null;
//   } catch (e) {
//     console.warn("[elements-data] resolvePropIdForSelection failed:", e);
//     return null;
//   }
// }

// const detectWallAndPrefill = async (components: OBC.Components, map: any) => {
//   try {
//     invalidateCachesIfIfcChanged();

//     const modelId = Object.keys(map as any)[0];
//     const elementId = modelId ? ([...(map as any)[modelId]][0] as number) : null;
//     if (!modelId || elementId == null) return;

//     const fragments = components.get(OBC.FragmentsManager);
//     const model: any = fragments.list.get(modelId);
//     if (!model || typeof model.getItemsData !== "function") return;

//     const itemsData = await model.getItemsData([elementId]);
//     const item = Array.isArray(itemsData) ? itemsData[0] : itemsData?.[0];
//     if (!item) return;

//     const typeName = String(item?._category?.value ?? "").toUpperCase();
//     isWallSelected = typeName === "IFCWALL" || typeName === "IFCWALLSTANDARDCASE";

//     // Prefill: override -> ART_Pieza desde IFC -> fallback Name.value
//     const overrideKey = `${modelId}:${elementId}:${PROP_NAME}`;



//     let fromIfcProp: string | null = null;
//     if (componentsRef && ifcStore.bytes) {
//       fromIfcProp = await getSingleValuePropertyNominalValueByElementId({
//         components: componentsRef,
//         ifcBytes: ifcStore.bytes,
//         elementExpressID: Number(elementId),
//         propName: PROP_NAME,
//       });
//     }

//     const fromName = String(item?.Name?.value ?? "");
//     panelValue = String(fromOverride ?? fromIfcProp ?? fromName ?? "");
//   } catch (e) {
//     console.warn("detectWallAndPrefill failed:", e);
//   }
// };

// const applyPanelValue = async () => {
//   try {
//     invalidateCachesIfIfcChanged();
//     if (!componentsRef) return;
//     if (!ifcStore.bytes) return;

//     const { modelId, elementId } = getCurrentSelection();
//     if (!modelId || elementId == null) return;

//     // Resolver robusto: NO depende del render del árbol
//     let propExpressId = propIdByElement.get(`${modelId}:${elementId}`) ?? null;
//     if (!propExpressId) {
//       propExpressId = await resolvePropIdForSelection();
//     }

//     // Fallback NO destructivo: si el árbol está expandido y ya tenemos localId, úsalo.
//     // Esto conserva tu “camino antiguo” como backup, sin obligar a expandir.
//     if (!propExpressId && targetPropLocalIds.size === 1) {
//       propExpressId = [...targetPropLocalIds][0];
//     }

//     if (!propExpressId) {
//       console.warn(
//         `No se encontró el expressID de ${PROP_NAME} para el elemento ${ifcStore.name ?? "model"}:${elementId}.`
//       );
//       return;
//     }

//     const newBytes = await setPropertySingleValueNominalValueAndElementNameById({
//       components: componentsRef,
//       ifcBytes: ifcStore.bytes,
//       propertyExpressID: Number(propExpressId),
//       expectedPropName: PROP_NAME,
//       elementExpressID: Number(elementId),
//       newValue: panelValue,
//     });

//     ifcStore.bytes = newBytes;
//     ifcStore.dirty = true;

//     // Guardar override de UI
//     const overrideKey = `${modelId}:${elementId}:${PROP_NAME}`;
//     ifcStore.overrides.set(overrideKey, panelValue);
// await onArtPiezaApplied(componentsRef, {
//   expressID: Number(elementId),
//   artPieza: String(panelValue),
// });

//     // Importante: invalidate porque bytes cambian
//     invalidateCachesIfIfcChanged();

//     refreshTable();
//     propsTable?.requestUpdate?.();
//     updatePanel?.();

    
//   } catch (e) {
//     console.warn("applyPanelValue failed:", e);
//   }
// };

// const initOnce = (components: OBC.Components) => {
//   if (initialized) return;
//   initialized = true;

//   componentsRef = components;

//   const highlighter = components.get(OBF.Highlighter);

//   const tuple = CUI.tables.itemsData({
//     components,
//     modelIdMap: {},
//   });
//   propsTable = tuple[0];
//   updatePropsTable = tuple[1];

//   propsTable.preserveStructureOnFilter = true;

//   /** Inline edit en tabla: se mantiene como lo tenías */
//   propsTable.dataTransform = {
//     ...propsTable.dataTransform,
//     Value: (value: any, rowData: any) => {
//       invalidateCachesIfIfcChanged();

//       const row = rowData as any;

//       // Detecta el Pset que contiene Name === ART_Pieza y guarda su localId
//       // (Solo sirve para inline edit; NO es requisito para el panel)
//       if (row?.type === "attribute" && row?.Name === "Name") {
//         if (String(row.Value) === PROP_NAME && Number.isFinite(row.localId)) {
//           targetPropLocalIds.add(Number(row.localId));
//         }
//         return value as any;
//       }

//       const isEditable =
//         row?.type === "attribute" &&
//         row?.Name === "NominalValue" &&
//         Number.isFinite(row.localId) &&
//         targetPropLocalIds.has(Number(row.localId));

//       if (!isEditable) return value as any;

//       const { modelId, elementId } = getCurrentSelection();
//       if (!modelId || elementId == null) return value as any;

//       const key = `${modelId}:${elementId}:${PROP_NAME}`;
//       const shown = ifcStore.overrides.get(key) ?? value ?? "";

//       const startEdit = () => {
//         editingKey = key;
//         editingValue = String(shown);
//         propsTable.requestUpdate();
//       };

//       const cancelEdit = () => {
//         editingKey = null;
//         editingValue = "";
//         propsTable.requestUpdate();
//       };

//       const commitEdit = async () => {
//         invalidateCachesIfIfcChanged();
//         if (!componentsRef) return;
//         if (!ifcStore.bytes) return;

//         const newBytes = await setPropertySingleValueNominalValueAndElementNameById({
//           components: componentsRef,
//           ifcBytes: ifcStore.bytes,
//           propertyExpressID: Number(row.localId),
//           expectedPropName: PROP_NAME,
//           elementExpressID: Number(elementId),
//           newValue: editingValue,
//         });

//         ifcStore.bytes = newBytes;
//         ifcStore.dirty = true;
//         ifcStore.overrides.set(key, editingValue);

//         // sync panel input si está visible
//         if (isWallSelected) panelValue = editingValue;
// await onArtPiezaApplied(componentsRef, {
//   expressID: Number(elementId),
//   artPieza: String(editingValue),
// });

//         editingKey = null;
//         editingValue = "";

//         invalidateCachesIfIfcChanged();

//         refreshTable();
//         updatePanel?.();
//       };

//       if (editingKey === key) {
//         return BUI.html`
// <div style="display:flex; gap:6px; align-items:center; width:100%; max-width:100%;">
//   <input
//     style="
//       flex:1 1 auto;
//       min-width:0;
//       padding:4px 6px;
//       font-size:0.85rem;
//       border:1px solid rgba(255,255,255,.2);
//       border-radius:6px;
//       background: rgba(255,255,255,0.9);
//       color: #1a1a1a;
//     "
//     .value=${editingValue}
//     @input=${(e: Event) => (editingValue = (e.target as HTMLInputElement).value)}
//     @keydown=${(e: KeyboardEvent) => {
//       if (e.key === "Enter") commitEdit();
//       if (e.key === "Escape") cancelEdit();
//     }}
//   />
//   <button
//     style="flex:0 0 auto; padding:4px 6px; border-radius:6px; cursor:pointer;"
//     title="Guardar"
//     @click=${commitEdit}
//   >✔</button>
//   <button
//     style="flex:0 0 auto; padding:4px 6px; border-radius:6px; cursor:pointer;"
//     title="Cancelar"
//     @click=${cancelEdit}
//   >✖</button>
// </div>
//         `;
//       }

//       return BUI.html`
//         <div style="display:flex; gap:6px; align-items:center;">
//           <span style="flex:1;">${String(shown)}</span>
//           <button @click=${startEdit}>✏️</button>
//         </div>
//       `;
//     },
//   };

//   /** Register events ONCE */
//   highlighter.events.select.onHighlight.add((map: any) => {
//     invalidateCachesIfIfcChanged();

//     lastModelIdMap = map as any;

//     // reset per selection (no afecta a otras funciones)
//     targetPropLocalIds.clear();
//     editingKey = null;

//     updatePropsTable?.({ modelIdMap: map });
//     propsTable.requestUpdate();

//     void (async () => {
//       await detectWallAndPrefill(components, map);

//       // ✅ clave: resuelve expressID sin depender del árbol
//       await resolvePropIdForSelection();

//       updatePanel?.();
//     })();
//   });

//   highlighter.events.select.onClear.add(() => {
//     invalidateCachesIfIfcChanged();

//     lastModelIdMap = {};
//     targetPropLocalIds.clear();
//     editingKey = null;

//     isWallSelected = false;
//     panelValue = "";

//     updatePropsTable?.({ modelIdMap: {} });
//     propsTable.requestUpdate();
//     updatePanel?.();
//   });
// };

// export const elementsDataPanelTemplate: BUI.StatefullComponent<
//   ElementsDataPanelState
// > = (state, update) => {
//   const { components } = state;

//   updatePanel = update;
//   initOnce(components);

//   const search = (e: Event) => {
//     if (!propsTable) return;
//     propsTable.queryString = (e.target as BUI.TextInput).value;
//   };

//   const toggleExpanded = () => {
//     if (!propsTable) return;
//     propsTable.expanded = !propsTable.expanded;
//     propsTable.requestUpdate();
//   };

//   return BUI.html`
//     <bim-panel-section fixed icon=${appIcons.TASK} label="Selection Data">
//       <div style="display:flex; gap:0.375rem;">
//         <bim-text-input
//           @input=${search}
//           vertical
//           placeholder="Search..."
//           debounce="200"
//         ></bim-text-input>

//         <bim-button
//           style="flex:0;"
//           @click=${toggleExpanded}
//           icon=${appIcons.EXPAND}
//         ></bim-button>

//         <bim-button
//           style="flex:0;"
//           @click=${onDownload}
//           icon="mdi:download"
//           ?disabled=${!ifcStore.dirty || !ifcStore.bytes}
//           tooltip-title="Descargar IFC"
//           tooltip-text="Descarga el IFC con todos los cambios acumulados."
//         ></bim-button>

//         <bim-button
//           style="flex:0;"
//           @click=${() => propsTable?.downloadData?.("ElementData", "tsv")}
//           icon=${appIcons.EXPORT}
//           tooltip-title="Export Data"
//           tooltip-text="Export the shown properties to TSV."
//         ></bim-button>
//       </div>

//       ${isWallSelected
//         ? BUI.html`
//           <div
//             style="
//               margin: 10px 0 12px 0;
//               padding: 10px;
//               border: 1px solid rgba(255,255,255,.12);
//               border-radius: 10px;
//             "
//           >
//             <div style="font-size: 0.85rem; opacity: 0.85; margin-bottom: 6px; color:white">
//               Renombrar:(ART_Pieza y Name)
//             </div>

//             <div style="display:flex; gap:8px; align-items:center;">
//               <input
//                 style="
//                   flex: 1 1 auto;
//                   min-width: 0;
//                   padding: 6px 8px;
//                   border: 1px solid rgba(255,255,255,.2);
//                   border-radius: 8px;
//                   background: rgba(255,255,255,0.9);
//                   color: #1a1a1a;
//                   font-size: 0.9rem;
//                 "
//                 .value=${panelValue}
//                 placeholder="Nuevo valor…"
//                 @input=${(e: Event) => (panelValue = (e.target as HTMLInputElement).value)}
//                 @keydown=${(e: KeyboardEvent) => {
//                   if (e.key === "Enter") applyPanelValue();
//                 }}
//               />

//               <button
//                 style="
//                   flex: 0 0 auto;
//                   padding: 6px 10px;
//                   border-radius: 8px;
//                   cursor: pointer;
//                 "
//                 title="Aplicar"
//                 @click=${applyPanelValue}
//               >
//                 Aplicar
//               </button>
//             </div>
//           </div>
//         `
//         : null}

//       ${propsTable}
//     </bim-panel-section>
//   `;
// };




// import * as BUI from "@thatopen/ui";
// import * as CUI from "@thatopen/ui-obc";
// import * as OBC from "@thatopen/components";
// import * as OBF from "@thatopen/components-front";
// import { appIcons } from "../../globals";

// import { ifcStore } from "../../ifc-store";
// import {
//   setPropertySingleValueNominalValueAndElementNameById,
//   getSingleValuePropertyExpressIdByElementId,
//   getSingleValuePropertyNominalValueByElementId,
// } from "../../ifc-edit";
// import { onArtPiezaApplied } from "./models";

// export interface ElementsDataPanelState {
//   components: OBC.Components;
// }

// const PROP_NAME = "ART_Pieza";

// /** =========================================================
//  *  Normalización / validación ART_Pieza
//  *  Usuario escribe: 1 -> T001, 10 -> T010, 800 -> T800, 1234 -> T1234
//  *  ========================================================= */
// function normalizeArtPiezaInput(
//   raw: string,
// ): { ok: true; value: string } | { ok: false; error: string } {
//   const s = (raw ?? "").trim();

//   if (s === "") return { ok: false, error: "Introduce un número." };
//   if (!/^\d+$/.test(s)) {
//     return { ok: false, error: "Solo se permite un número entero (sin letras ni decimales)." };
//   }

//   const n = Number(s);
//   if (!Number.isFinite(n)) return { ok: false, error: "Número inválido." };
//   if (n < 0) return { ok: false, error: "El número no puede ser negativo." };

//   // mínimo 3 dígitos; si tiene 4+ se respeta
//   const digits = String(n);
//   const padded = digits.length < 3 ? digits.padStart(3, "0") : digits;

//   return { ok: true, value: `T${padded}` };
// }

// /** =========
//  *  Module-level singletons (persist across rerenders)
//  *  ========= */
// let initialized = false;
// let updatePanel: (() => void) | null = null;

// let propsTable: any = null;
// let updatePropsTable: ((args: any) => void) | null = null;

// let componentsRef: OBC.Components | null = null;

// /** Selection + UI state */
// let lastModelIdMap: { [key: string]: Set<number> } = {};
// let isWallSelected = false;
// let panelValue = "";

// /** Inline editing state */
// let editingKey: string | null = null;
// let editingValue = "";

// /**
//  * expressIDs of IfcPropertySingleValue for ART_Pieza
//  * (collected while rendering the property tree, only for inline edit)
//  */
// const targetPropLocalIds = new Set<number>();

// /** Cache robusto: expressID de ART_Pieza por elemento seleccionado */
// const propIdByElement = new Map<string, number>(); // `${modelId}:${elementId}`

// /**
//  * Para no “romper” nada, invalidamos cache si cambia el objeto bytes
//  * (tu pipeline reasigna ifcStore.bytes = newBytes)
//  */
// let lastIfcBytesRef: Uint8Array | null = null;
// const invalidateCachesIfIfcChanged = () => {
//   if (ifcStore.bytes && ifcStore.bytes !== lastIfcBytesRef) {
//     lastIfcBytesRef = ifcStore.bytes;

//     // Cache de prop IDs puede quedar desalineado si el modelo cambia
//     propIdByElement.clear();

//     // Esto solo afecta al inline edit y se repuebla al renderizar
//     targetPropLocalIds.clear();
//   }
// };

// const getCurrentSelection = () => {
//   const modelId = Object.keys(lastModelIdMap)[0];
//   const elementId = modelId ? [...lastModelIdMap[modelId]][0] : null;
//   return { modelId, elementId };
// };

// const downloadIfc = (bytes: Uint8Array, filename: string) => {
//   const safeBytes = new Uint8Array(bytes);
//   const blob = new Blob([safeBytes], { type: "application/octet-stream" });

//   const a = document.createElement("a");
//   a.href = URL.createObjectURL(blob);
//   a.download = filename;
//   a.click();
//   URL.revokeObjectURL(a.href);
// };

// const onDownload = () => {
//   if (!ifcStore.bytes) return;

//   downloadIfc(ifcStore.bytes, `${ifcStore.name ?? "model"}-edited.ifc`);

//   ifcStore.dirty = false;
//   updatePanel?.();
// };

// const refreshTable = () => {
//   if (!updatePropsTable) return;
//   updatePropsTable({ modelIdMap: lastModelIdMap });
// };

// /**
//  * Resuelve el expressID de la propiedad ART_Pieza para el elemento seleccionado.
//  * NO depende de expandir árbol.
//  */
// async function resolvePropIdForSelection(): Promise<number | null> {
//   invalidateCachesIfIfcChanged();
//   if (!componentsRef || !ifcStore.bytes) return null;

//   const { modelId, elementId } = getCurrentSelection();
//   if (!modelId || elementId == null) return null;

//   const key = `${modelId}:${elementId}`;
//   const cached = propIdByElement.get(key);
//   if (cached) return cached;

//   try {
//     const propId = await getSingleValuePropertyExpressIdByElementId({
//       components: componentsRef,
//       ifcBytes: ifcStore.bytes,
//       elementExpressID: Number(elementId),
//       expectedPropName: PROP_NAME,
//     });

//     if (propId) propIdByElement.set(key, propId);

//     if (!propId) {
//       console.warn(
//         `[elements-data] No se pudo resolver ${PROP_NAME}. selection elementId=${elementId} modelKey=${modelId}. ` +
//           `Si el IFC lo tiene, revisa getSingleValuePropertyExpressIdByElementId o el ID de selección.`,
//       );
//     }

//     return propId ?? null;
//   } catch (e) {
//     console.warn("[elements-data] resolvePropIdForSelection failed:", e);
//     return null;
//   }
// }

// const detectWallAndPrefill = async (components: OBC.Components, map: any) => {
//   try {
//     invalidateCachesIfIfcChanged();

//     const modelId = Object.keys(map as any)[0];
//     const elementId = modelId ? ([...(map as any)[modelId]][0] as number) : null;
//     if (!modelId || elementId == null) return;

//     const fragments = components.get(OBC.FragmentsManager);
//     const model: any = fragments.list.get(modelId);
//     if (!model || typeof model.getItemsData !== "function") return;

//     const itemsData = await model.getItemsData([elementId]);
//     const item = Array.isArray(itemsData) ? itemsData[0] : itemsData?.[0];
//     if (!item) return;

//     const typeName = String(item?._category?.value ?? "").toUpperCase();
//     isWallSelected = typeName === "IFCWALL" || typeName === "IFCWALLSTANDARDCASE";

//     // Prefill: override -> ART_Pieza desde IFC -> fallback Name.value
//     const overrideKey = `${modelId}:${elementId}:${PROP_NAME}`;
//     const fromOverride = ifcStore.overrides.get(overrideKey);

//     let fromIfcProp: string | null = null;
//     if (componentsRef && ifcStore.bytes) {
//       fromIfcProp = await getSingleValuePropertyNominalValueByElementId({
//         components: componentsRef,
//         ifcBytes: ifcStore.bytes,
//         elementExpressID: Number(elementId),
//         propName: PROP_NAME,
//       });
//     }

//     const fromName = String(item?.Name?.value ?? "");
//     panelValue = String(fromOverride ?? fromIfcProp ?? fromName ?? "");
//   } catch (e) {
//     console.warn("detectWallAndPrefill failed:", e);
//   }
// };

// const applyPanelValue = async () => {
//   try {
//     invalidateCachesIfIfcChanged();
//     if (!componentsRef) return;
//     if (!ifcStore.bytes) return;

//     const { modelId, elementId } = getCurrentSelection();
//     if (!modelId || elementId == null) return;

//     // ✅ Validar/normalizar input
//     const normalized = normalizeArtPiezaInput(panelValue);
//     if (!normalized.ok) {
//       console.warn(`[${PROP_NAME}] ${normalized.error}`);
//       return;
//     }
//     const finalValue = normalized.value;

//     // Resolver robusto: NO depende del render del árbol
//     let propExpressId = propIdByElement.get(`${modelId}:${elementId}`) ?? null;
//     if (!propExpressId) {
//       propExpressId = await resolvePropIdForSelection();
//     }

//     // Fallback: si el árbol está expandido y ya tenemos localId, úsalo.
//     if (!propExpressId && targetPropLocalIds.size === 1) {
//       propExpressId = [...targetPropLocalIds][0];
//     }

//     if (!propExpressId) {
//       console.warn(
//         `No se encontró el expressID de ${PROP_NAME} para el elemento ${ifcStore.name ?? "model"}:${elementId}.`,
//       );
//       return;
//     }

//     const newBytes = await setPropertySingleValueNominalValueAndElementNameById({
//       components: componentsRef,
//       ifcBytes: ifcStore.bytes,
//       propertyExpressID: Number(propExpressId),
//       expectedPropName: PROP_NAME,
//       elementExpressID: Number(elementId),
//       newValue: finalValue, // ✅ guardar valor normalizado
//     });

//     ifcStore.bytes = newBytes;
//     ifcStore.dirty = true;

//     // Guardar override de UI
//     const overrideKey = `${modelId}:${elementId}:${PROP_NAME}`;
//     ifcStore.overrides.set(overrideKey, finalValue);

//     // Que el usuario vea lo realmente guardado
//     panelValue = finalValue;

//     // ✅ CLAVE: actualizar labels/highlight/hide/report en models.ts
//     await onArtPiezaApplied(componentsRef, {
//       expressID: Number(elementId),
//       artPieza: finalValue,
//     });

//     // Importante: invalidate porque bytes cambian
//     invalidateCachesIfIfcChanged();

//     refreshTable();
//     propsTable?.requestUpdate?.();
//     updatePanel?.();
//   } catch (e) {
//     console.warn("applyPanelValue failed:", e);
//   }
// };

// const initOnce = (components: OBC.Components) => {
//   if (initialized) return;
//   initialized = true;

//   componentsRef = components;

//   const highlighter = components.get(OBF.Highlighter);

//   const tuple = CUI.tables.itemsData({
//     components,
//     modelIdMap: {},
//   });
//   propsTable = tuple[0];
//   updatePropsTable = tuple[1];

//   propsTable.preserveStructureOnFilter = true;

//   /** Inline edit en tabla */
//   propsTable.dataTransform = {
//     ...propsTable.dataTransform,
//     Value: (value: any, rowData: any) => {
//       invalidateCachesIfIfcChanged();

//       const row = rowData as any;

//       // Detecta el Pset que contiene Name === ART_Pieza y guarda su localId
//       if (row?.type === "attribute" && row?.Name === "Name") {
//         if (String(row.Value) === PROP_NAME && Number.isFinite(row.localId)) {
//           targetPropLocalIds.add(Number(row.localId));
//         }
//         return value as any;
//       }

//       const isEditable =
//         row?.type === "attribute" &&
//         row?.Name === "NominalValue" &&
//         Number.isFinite(row.localId) &&
//         targetPropLocalIds.has(Number(row.localId));

//       if (!isEditable) return value as any;

//       const { modelId, elementId } = getCurrentSelection();
//       if (!modelId || elementId == null) return value as any;

//       const key = `${modelId}:${elementId}:${PROP_NAME}`;
//       const shown = ifcStore.overrides.get(key) ?? value ?? "";

//       const startEdit = () => {
//         editingKey = key;
//         editingValue = String(shown);
//         propsTable.requestUpdate();
//       };

//       const cancelEdit = () => {
//         editingKey = null;
//         editingValue = "";
//         propsTable.requestUpdate();
//       };

//       const commitEdit = async () => {
//         invalidateCachesIfIfcChanged();
//         if (!componentsRef) return;
//         if (!ifcStore.bytes) return;

//         // ✅ Validar/normalizar inline edit
//         const normalized = normalizeArtPiezaInput(editingValue);
//         if (!normalized.ok) {
//           console.warn(`[${PROP_NAME}] ${normalized.error}`);
//           return;
//         }
//         const finalValue = normalized.value;

//         const newBytes = await setPropertySingleValueNominalValueAndElementNameById({
//           components: componentsRef,
//           ifcBytes: ifcStore.bytes,
//           propertyExpressID: Number(row.localId),
//           expectedPropName: PROP_NAME,
//           elementExpressID: Number(elementId),
//           newValue: finalValue,
//         });

//         ifcStore.bytes = newBytes;
//         ifcStore.dirty = true;
//         ifcStore.overrides.set(key, finalValue);

//         // sync panel input si está visible
//         if (isWallSelected) panelValue = finalValue;

//         await onArtPiezaApplied(componentsRef, {
//           expressID: Number(elementId),
//           artPieza: finalValue,
//         });

//         editingKey = null;
//         editingValue = "";

//         invalidateCachesIfIfcChanged();

//         refreshTable();
//         updatePanel?.();
//       };

//       if (editingKey === key) {
//         return BUI.html`
// <div style="display:flex; gap:6px; align-items:center; width:100%; max-width:100%;">
//   <input
//     style="
//       flex:1 1 auto;
//       min-width:0;
//       padding:4px 6px;
//       font-size:0.85rem;
//       border:1px solid rgba(255,255,255,.2);
//       border-radius:6px;
//       background: rgba(255,255,255,0.9);
//       color: #1a1a1a;
//     "
//     .value=${editingValue}
//     inputmode="numeric"
//     pattern="[0-9]*"
//     @input=${(e: Event) => (editingValue = (e.target as HTMLInputElement).value)}
//     @keydown=${(e: KeyboardEvent) => {
//       if (e.key === "Enter") commitEdit();
//       if (e.key === "Escape") cancelEdit();
//     }}
//   />
//   <button
//     style="flex:0 0 auto; padding:4px 6px; border-radius:6px; cursor:pointer;"
//     title="Guardar"
//     @click=${commitEdit}
//   >✔</button>
//   <button
//     style="flex:0 0 auto; padding:4px 6px; border-radius:6px; cursor:pointer;"
//     title="Cancelar"
//     @click=${cancelEdit}
//   >✖</button>
// </div>
//         `;
//       }

//       return BUI.html`
//         <div style="display:flex; gap:6px; align-items:center;">
//           <span style="flex:1;">${String(shown)}</span>
//           <button @click=${startEdit}>✏️</button>
//         </div>
//       `;
//     },
//   };

//   /** Register events ONCE */
//   highlighter.events.select.onHighlight.add((map: any) => {
//     invalidateCachesIfIfcChanged();

//     lastModelIdMap = map as any;

//     // reset per selection
//     targetPropLocalIds.clear();
//     editingKey = null;

//     updatePropsTable?.({ modelIdMap: map });
//     propsTable.requestUpdate();

//     void (async () => {
//       await detectWallAndPrefill(components, map);
//       await resolvePropIdForSelection();
//       updatePanel?.();
//     })();
//   });

//   highlighter.events.select.onClear.add(() => {
//     invalidateCachesIfIfcChanged();

//     lastModelIdMap = {};
//     targetPropLocalIds.clear();
//     editingKey = null;

//     isWallSelected = false;
//     panelValue = "";

//     updatePropsTable?.({ modelIdMap: {} });
//     propsTable.requestUpdate();
//     updatePanel?.();
//   });
// };

// export const elementsDataPanelTemplate: BUI.StatefullComponent<ElementsDataPanelState> = (
//   state,
//   update,
// ) => {
//   const { components } = state;

//   updatePanel = update;
//   initOnce(components);

//   const search = (e: Event) => {
//     if (!propsTable) return;
//     propsTable.queryString = (e.target as BUI.TextInput).value;
//   };

//   const toggleExpanded = () => {
//     if (!propsTable) return;
//     propsTable.expanded = !propsTable.expanded;
//     propsTable.requestUpdate();
//   };

//   return BUI.html`
//     <bim-panel-section fixed icon=${appIcons.TASK} label="Selection Data">
//       <div style="display:flex; gap:0.375rem;">
//         <bim-text-input
//           @input=${search}
//           vertical
//           placeholder="Search..."
//           debounce="200"
//         ></bim-text-input>

//         <bim-button
//           style="flex:0;"
//           @click=${toggleExpanded}
//           icon=${appIcons.EXPAND}
//         ></bim-button>

//         <bim-button
//           style="flex:0;"
//           @click=${onDownload}
//           icon="mdi:download"
//           ?disabled=${!ifcStore.dirty || !ifcStore.bytes}
//           tooltip-title="Descargar IFC"
//           tooltip-text="Descarga el IFC con todos los cambios acumulados."
//         ></bim-button>

//         <bim-button
//           style="flex:0;"
//           @click=${() => propsTable?.downloadData?.("ElementData", "tsv")}
//           icon=${appIcons.EXPORT}
//           tooltip-title="Export Data"
//           tooltip-text="Export the shown properties to TSV."
//         ></bim-button>
//       </div>

//       ${isWallSelected
//         ? BUI.html`
//           <div
//             style="
//               margin: 10px 0 12px 0;
//               padding: 10px;
//               border: 1px solid rgba(255,255,255,.12);
//               border-radius: 10px;
//             "
//           >
//             <div style="font-size: 0.85rem; opacity: 0.85; margin-bottom: 6px; color:white">
//               Renombrar:(ART_Pieza y Name)
//             </div>

//             <div style="display:flex; gap:8px; align-items:center;">
//               <input
//                 style="
//                   flex: 1 1 auto;
//                   min-width: 0;
//                   padding: 6px 8px;
//                   border: 1px solid rgba(255,255,255,.2);
//                   border-radius: 8px;
//                   background: rgba(255,255,255,0.9);
//                   color: #1a1a1a;
//                   font-size: 0.9rem;
//                 "
//                 .value=${panelValue}
//                 placeholder="Número… (ej: 1 → T001, 1234 → T1234)"
//                 inputmode="numeric"
//                 pattern="[0-9]*"
//                 @input=${(e: Event) => (panelValue = (e.target as HTMLInputElement).value)}
//                 @keydown=${(e: KeyboardEvent) => {
//                   if (e.key === "Enter") applyPanelValue();
//                 }}
//               />

//               <button
//                 style="
//                   flex: 0 0 auto;
//                   padding: 6px 10px;
//                   border-radius: 8px;
//                   cursor: pointer;
//                 "
//                 title="Aplicar"
//                 @click=${applyPanelValue}
//               >
//                 Aplicar
//               </button>
//             </div>
//           </div>
//         `
//         : null}

//       ${propsTable}
//     </bim-panel-section>
//   `;
// };
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { appIcons } from "../../globals";

import { ifcStore } from "../../ifc-store";
import {
  setPropertySingleValueNominalValueAndElementNameById,
  getSingleValuePropertyExpressIdByElementId,
  getSingleValuePropertyNominalValueByElementId,
} from "../../ifc-edit";
import { onArtPiezaApplied } from "./models";

export interface ElementsDataPanelState {
  components: OBC.Components;
}

const PROP_NAME = "ART_Pieza";

/** =========================================================
 *  Normalización / validación ART_Pieza
 *  Usuario escribe: 1 -> T001, 10 -> T010, 800 -> T800, 1234 -> T1234
 *  ========================================================= */
function normalizeArtPiezaInput(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const s = (raw ?? "").trim();

  if (s === "") return { ok: false, error: "Introduce un número." };

  // Solo dígitos (sin signos, sin decimales, sin letras)
  if (!/^\d+$/.test(s)) {
    return { ok: false, error: "Solo se permite un número entero (sin letras ni decimales)." };
  }

  // Normalizamos usando Number para evitar inputs raros tipo "000000"
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: "Número inválido." };
  if (n < 0) return { ok: false, error: "El número no puede ser negativo." };

  // mínimo 3 dígitos; si tiene 4+ se respeta
  const digits = String(n);
  const padded = digits.length < 3 ? digits.padStart(3, "0") : digits;

  return { ok: true, value: `T${padded}` };
}

/** =========
 *  Module-level singletons (persist across rerenders)
 *  ========= */
let initialized = false;
let updatePanel: (() => void) | null = null;

let propsTable: any = null;
let updatePropsTable: ((args: any) => void) | null = null;

let componentsRef: OBC.Components | null = null;

/** Selection + UI state */
let lastModelIdMap: { [key: string]: Set<number> } = {};
let isWallSelected = false;
let panelValue = "";

// ✅ feedback visible para el usuario
let panelError: string | null = null;
let panelSuccess: string | null = null;

/** Inline editing state */
let editingKey: string | null = null;
let editingValue = "";

/**
 * expressIDs of IfcPropertySingleValue for ART_Pieza
 * (collected while rendering the property tree, only for inline edit)
 */
const targetPropLocalIds = new Set<number>();

/** Cache robusto: expressID de ART_Pieza por elemento seleccionado */
const propIdByElement = new Map<string, number>(); // `${modelId}:${elementId}`

/**
 * Para no “romper” nada, invalidamos cache si cambia el objeto bytes
 * (tu pipeline reasigna ifcStore.bytes = newBytes)
 */
let lastIfcBytesRef: Uint8Array | null = null;
const invalidateCachesIfIfcChanged = () => {
  if (ifcStore.bytes && ifcStore.bytes !== lastIfcBytesRef) {
    lastIfcBytesRef = ifcStore.bytes;

    // Cache de prop IDs puede quedar desalineado si el modelo cambia
    propIdByElement.clear();

    // Esto solo afecta al inline edit y se repuebla al renderizar
    targetPropLocalIds.clear();
  }
};

const getCurrentSelection = () => {
  const modelId = Object.keys(lastModelIdMap)[0];
  const elementId = modelId ? [...lastModelIdMap[modelId]][0] : null;
  return { modelId, elementId };
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getDateTimeStamp() {
  const d = new Date();
  const date = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  return { date, time };
}

function stripTrailingTimestamp(name: string) {
  // quita _YYYYMMDD_HHMMSS al final si existe
  return name.replace(/_\d{8}_\d{6}$/, "");
}


const downloadIfc = async (bytes: Uint8Array, filename: string) => {
  const safeBytes = new Uint8Array(bytes);
  const blob = new Blob([safeBytes], { type: "application/octet-stream" });

  const supportsSave =
    "showSaveFilePicker" in window &&
    typeof (window as any).showSaveFilePicker === "function";

  if (supportsSave) {
    const opts: any = {
      suggestedName: filename,
      types: [
        {
          description: "IFC",
          accept: {
            "application/octet-stream": [".ifc"],
            "model/ifc": [".ifc"],
          },
        },
      ],
    };

    // 👇 Esto hace que el diálogo “arranque” en la carpeta del archivo abierto (si hay handle)
    if (ifcStore.fileHandle) {
      opts.startIn = ifcStore.fileHandle;
    }

    const handle = await (window as any).showSaveFilePicker(opts);
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  // fallback (Firefox, etc.)
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};


const onDownload = async () => {
  if (!ifcStore.bytes) return;

  const { date, time } = getDateTimeStamp();

  const baseRaw = ifcStore.name ?? "model";
  const base = stripTrailingTimestamp(baseRaw); // extra-seguro
  const filename = `${base}_${date}_${time}.ifc`;

  await downloadIfc(ifcStore.bytes, filename);

  ifcStore.dirty = false;
  updatePanel?.();
};



const refreshTable = () => {
  if (!updatePropsTable) return;
  updatePropsTable({ modelIdMap: lastModelIdMap });
};

/**
 * Resuelve el expressID de la propiedad ART_Pieza para el elemento seleccionado.
 * NO depende de expandir árbol.
 */
async function resolvePropIdForSelection(): Promise<number | null> {
  invalidateCachesIfIfcChanged();
  if (!componentsRef || !ifcStore.bytes) return null;

  const { modelId, elementId } = getCurrentSelection();
  if (!modelId || elementId == null) return null;

  const key = `${modelId}:${elementId}`;
  const cached = propIdByElement.get(key);
  if (cached) return cached;

  try {
    const propId = await getSingleValuePropertyExpressIdByElementId({
      components: componentsRef,
      ifcBytes: ifcStore.bytes,
      elementExpressID: Number(elementId),
      expectedPropName: PROP_NAME,
    });

    if (propId) propIdByElement.set(key, propId);

    if (!propId) {
      console.warn(
        `[elements-data] No se pudo resolver ${PROP_NAME}. selection elementId=${elementId} modelKey=${modelId}. ` +
          `Si el IFC lo tiene, revisa getSingleValuePropertyExpressIdByElementId o el ID de selección.`,
      );
    }

    return propId ?? null;
  } catch (e) {
    console.warn("[elements-data] resolvePropIdForSelection failed:", e);
    return null;
  }
}

const detectWallAndPrefill = async (components: OBC.Components, map: any) => {
  try {
    invalidateCachesIfIfcChanged();

    const modelId = Object.keys(map as any)[0];
    const elementId = modelId ? ([...(map as any)[modelId]][0] as number) : null;
    if (!modelId || elementId == null) return;

    const fragments = components.get(OBC.FragmentsManager);
    const model: any = fragments.list.get(modelId);
    if (!model || typeof model.getItemsData !== "function") return;

    const itemsData = await model.getItemsData([elementId]);
    const item = Array.isArray(itemsData) ? itemsData[0] : itemsData?.[0];
    if (!item) return;

    const typeName = String(item?._category?.value ?? "").toUpperCase();
    isWallSelected = typeName === "IFCWALL" || typeName === "IFCWALLSTANDARDCASE";

    // Prefill: override -> ART_Pieza desde IFC -> fallback Name.value
    const overrideKey = `${modelId}:${elementId}:${PROP_NAME}`;
    const fromOverride = ifcStore.overrides.get(overrideKey);

    let fromIfcProp: string | null = null;
    if (componentsRef && ifcStore.bytes) {
      fromIfcProp = await getSingleValuePropertyNominalValueByElementId({
        components: componentsRef,
        ifcBytes: ifcStore.bytes,
        elementExpressID: Number(elementId),
        propName: PROP_NAME,
      });
    }

    const fromName = String(item?.Name?.value ?? "");
    panelValue = String(fromOverride ?? fromIfcProp ?? fromName ?? "");

    // limpiar mensajes al cambiar selección
    panelError = null;
    panelSuccess = null;
  } catch (e) {
    console.warn("detectWallAndPrefill failed:", e);
  }
};

const applyPanelValue = async () => {
  try {
    invalidateCachesIfIfcChanged();
    if (!componentsRef) return;
    if (!ifcStore.bytes) return;

    const { modelId, elementId } = getCurrentSelection();
    if (!modelId || elementId == null) return;

    // ✅ Validar/normalizar input
    const normalized = normalizeArtPiezaInput(panelValue);
    if (!normalized.ok) {
      panelError = normalized.error;
      panelSuccess = null;
      updatePanel?.();
      return;
    }
    const finalValue = normalized.value;
    panelError = null;
    panelSuccess = null;

    // Resolver robusto: NO depende del render del árbol
    let propExpressId = propIdByElement.get(`${modelId}:${elementId}`) ?? null;
    if (!propExpressId) {
      propExpressId = await resolvePropIdForSelection();
    }

    // Fallback: si el árbol está expandido y ya tenemos localId, úsalo.
    if (!propExpressId && targetPropLocalIds.size === 1) {
      propExpressId = [...targetPropLocalIds][0];
    }

    if (!propExpressId) {
      panelError = `No se encontró la propiedad ${PROP_NAME} para el elemento seleccionado.`;
      panelSuccess = null;
      updatePanel?.();
      return;
    }

    const newBytes = await setPropertySingleValueNominalValueAndElementNameById({
      components: componentsRef,
      ifcBytes: ifcStore.bytes,
      propertyExpressID: Number(propExpressId),
      expectedPropName: PROP_NAME,
      elementExpressID: Number(elementId),
      newValue: finalValue, // ✅ guardar normalizado
    });

    ifcStore.bytes = newBytes;
    ifcStore.dirty = true;

    // Guardar override de UI (para que tabla muestre valor sin re-leer IFC)
    const overrideKey = `${modelId}:${elementId}:${PROP_NAME}`;
    ifcStore.overrides.set(overrideKey, finalValue);

    // Mostrar al usuario el valor final
    panelValue = finalValue;

    // ✅ CLAVE: actualizar labels/highlight/hide/report en models.ts
    await onArtPiezaApplied(componentsRef, {
      expressID: Number(elementId),
      artPieza: finalValue,
    });

    // feedback
    panelSuccess = `Guardado como ${finalValue}`;
    panelError = null;

    // Importante: invalidate porque bytes cambian
    invalidateCachesIfIfcChanged();

    refreshTable();
    propsTable?.requestUpdate?.();
    updatePanel?.();
  } catch (e) {
    panelError = "No se pudo aplicar el cambio. Revisa el valor e inténtalo de nuevo.";
    panelSuccess = null;
    updatePanel?.();
    console.warn("applyPanelValue failed:", e);
  }
};

const initOnce = (components: OBC.Components) => {
  if (initialized) return;
  initialized = true;

  componentsRef = components;

  const highlighter = components.get(OBF.Highlighter);

  const tuple = CUI.tables.itemsData({
    components,
    modelIdMap: {},
  });
  propsTable = tuple[0];
  updatePropsTable = tuple[1];

  propsTable.preserveStructureOnFilter = true;

  /** Inline edit en tabla */
  propsTable.dataTransform = {
    ...propsTable.dataTransform,
    Value: (value: any, rowData: any) => {
      invalidateCachesIfIfcChanged();

      const row = rowData as any;

      // Detecta el Pset que contiene Name === ART_Pieza y guarda su localId
      if (row?.type === "attribute" && row?.Name === "Name") {
        if (String(row.Value) === PROP_NAME && Number.isFinite(row.localId)) {
          targetPropLocalIds.add(Number(row.localId));
        }
        return value as any;
      }

      const isEditable =
        row?.type === "attribute" &&
        row?.Name === "NominalValue" &&
        Number.isFinite(row.localId) &&
        targetPropLocalIds.has(Number(row.localId));

      if (!isEditable) return value as any;

      const { modelId, elementId } = getCurrentSelection();
      if (!modelId || elementId == null) return value as any;

      const key = `${modelId}:${elementId}:${PROP_NAME}`;
      const shown = ifcStore.overrides.get(key) ?? value ?? "";

      const startEdit = () => {
        editingKey = key;
        editingValue = String(shown);
        // limpiar mensajes
        panelError = null;
        panelSuccess = null;
        propsTable.requestUpdate();
        updatePanel?.();
      };

      const cancelEdit = () => {
        editingKey = null;
        editingValue = "";
        propsTable.requestUpdate();
      };

      const commitEdit = async () => {
        invalidateCachesIfIfcChanged();
        if (!componentsRef) return;
        if (!ifcStore.bytes) return;

        // ✅ Validar/normalizar inline edit
        const normalized = normalizeArtPiezaInput(editingValue);
        if (!normalized.ok) {
          panelError = normalized.error;
          panelSuccess = null;
          updatePanel?.();
          return;
        }
        const finalValue = normalized.value;

        const newBytes = await setPropertySingleValueNominalValueAndElementNameById({
          components: componentsRef,
          ifcBytes: ifcStore.bytes,
          propertyExpressID: Number(row.localId),
          expectedPropName: PROP_NAME,
          elementExpressID: Number(elementId),
          newValue: finalValue,
        });

        ifcStore.bytes = newBytes;
        ifcStore.dirty = true;
        ifcStore.overrides.set(key, finalValue);

        // sync panel input si está visible
        if (isWallSelected) panelValue = finalValue;

        await onArtPiezaApplied(componentsRef, {
          expressID: Number(elementId),
          artPieza: finalValue,
        });

        panelSuccess = `Guardado como ${finalValue}`;
        panelError = null;

        editingKey = null;
        editingValue = "";

        invalidateCachesIfIfcChanged();

        refreshTable();
        updatePanel?.();
      };

      if (editingKey === key) {
        return BUI.html`
<div style="display:flex; gap:6px; align-items:center; width:100%; max-width:100%;">
  <input
    style="
      flex:1 1 auto;
      min-width:0;
      padding:4px 6px;
      font-size:0.85rem;
      border:1px solid rgba(255,255,255,.2);
      border-radius:6px;
      background: rgba(255,255,255,0.9);
      color: #1a1a1a;
    "
    .value=${editingValue}
    inputmode="numeric"
    pattern="[0-9]*"
    @input=${(e: Event) => {
      editingValue = (e.target as HTMLInputElement).value;
      panelError = null;
      panelSuccess = null;
      updatePanel?.();
    }}
    @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") cancelEdit();
    }}
  />
  <button
    style="flex:0 0 auto; padding:4px 6px; border-radius:6px; cursor:pointer;"
    title="Guardar"
    @click=${commitEdit}
  >✔</button>
  <button
    style="flex:0 0 auto; padding:4px 6px; border-radius:6px; cursor:pointer;"
    title="Cancelar"
    @click=${cancelEdit}
  >✖</button>
</div>
        `;
      }

      return BUI.html`
        <div style="display:flex; gap:6px; align-items:center;">
          <span style="flex:1;">${String(shown)}</span>
          <button @click=${startEdit}>✏️</button>
        </div>
      `;
    },
  };

  /** Register events ONCE */
  highlighter.events.select.onHighlight.add((map: any) => {
    invalidateCachesIfIfcChanged();

    lastModelIdMap = map as any;

    // reset per selection
    targetPropLocalIds.clear();
    editingKey = null;

    // limpiar mensajes al cambiar selección
    panelError = null;
    panelSuccess = null;

    updatePropsTable?.({ modelIdMap: map });
    propsTable.requestUpdate();

    void (async () => {
      await detectWallAndPrefill(components, map);
      await resolvePropIdForSelection();
      updatePanel?.();
    })();
  });

  highlighter.events.select.onClear.add(() => {
    invalidateCachesIfIfcChanged();

    lastModelIdMap = {};
    targetPropLocalIds.clear();
    editingKey = null;

    isWallSelected = false;
    panelValue = "";

    panelError = null;
    panelSuccess = null;

    updatePropsTable?.({ modelIdMap: {} });
    propsTable.requestUpdate();
    updatePanel?.();
  });
};

export const elementsDataPanelTemplate: BUI.StatefullComponent<ElementsDataPanelState> = (
  state,
  update,
) => {
  const { components } = state;

  updatePanel = update;
  initOnce(components);

  const search = (e: Event) => {
    if (!propsTable) return;
    propsTable.queryString = (e.target as BUI.TextInput).value;
  };

  const toggleExpanded = () => {
    if (!propsTable) return;
    propsTable.expanded = !propsTable.expanded;
    propsTable.requestUpdate();
  };

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.TASK} label="Selection Data">
      <div style="display:flex; gap:0.375rem;">
        <bim-text-input
          @input=${search}
          vertical
          placeholder="Search..."
          debounce="200"
        ></bim-text-input>

        <bim-button
          style="flex:0;"
          @click=${toggleExpanded}
          icon=${appIcons.EXPAND}
        ></bim-button>

        <bim-button
          style="flex:0;"
          @click=${onDownload}
          icon="mdi:download"
          ?disabled=${!ifcStore.dirty || !ifcStore.bytes}
          tooltip-title="Descargar IFC"
          tooltip-text="Descarga el IFC con todos los cambios acumulados."
        ></bim-button>

        <bim-button
          style="flex:0;"
          @click=${() => propsTable?.downloadData?.("ElementData", "tsv")}
          icon=${appIcons.EXPORT}
          tooltip-title="Export Data"
          tooltip-text="Export the shown properties to TSV."
        ></bim-button>
      </div>

      ${isWallSelected
        ? BUI.html`
          <div
            style="
              margin: 10px 0 12px 0;
              padding: 10px;
              border: 1px solid rgba(255,255,255,.12);
              border-radius: 10px;
            "
          >
            <div style="font-size: 0.85rem; opacity: 0.85; margin-bottom: 6px; color:grey">
              Renombrar:(ART_Pieza y Name)
            </div>

            <div style="display:flex; gap:8px; align-items:center;">
              <input
                style="
                  flex: 1 1 auto;
                  min-width: 0;
                  padding: 6px 8px;
                  border: 1px solid rgba(255,255,255,.2);
                  border-radius: 8px;
                  background: rgba(255,255,255,0.9);
                  color: #1a1a1a;
                  font-size: 0.9rem;
                "
                .value=${panelValue}
                placeholder="Número… (ej: 1 → T001, 1234 → T1234)"
                inputmode="numeric"
                pattern="[0-9]*"
                @input=${(e: Event) => {
                  panelValue = (e.target as HTMLInputElement).value;
                  panelError = null;
                  panelSuccess = null;
                  updatePanel?.();
                }}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === "Enter") applyPanelValue();
                }}
              />

              <button
                style="
                  flex: 0 0 auto;
                  padding: 6px 10px;
                  border-radius: 8px;
                  cursor: pointer;
                "
                title="Aplicar"
                @click=${applyPanelValue}
              >
                Aplicar
              </button>
            </div>

            ${panelError
              ? BUI.html`
                  <div style="margin-top:8px; color:#ff6b6b; font-size:0.85rem;">
                    ${panelError}
                  </div>
                `
              : panelSuccess
                ? BUI.html`
                    <div style="margin-top:8px;color:#1b5e20; font-size:0.85rem;">
                      ${panelSuccess}
                    </div>
                  `
                : null}
          </div>
        `
        : null}

      ${propsTable}
    </bim-panel-section>
  `;
};
