// src/ui-templates/sections/viewpoints.ts

import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

import {
  getArtPiezaReport,
  subscribeArtPiezaReport,
} from "../../art-pieza-report-store";

export interface ViewpointsPanelState {
  components: OBC.Components;
  world?: OBC.World;
}

// ✅ Evita suscripciones duplicadas por HMR/render
const subscribedUpdates = new WeakSet<Function>();

export const viewpointsPanelTemplate: BUI.StatefullComponent<ViewpointsPanelState> =
  (state, update) => {
    // ✅ suscribir SOLO una vez por instancia real de update()
    if (!subscribedUpdates.has(update as any)) {
      subscribedUpdates.add(update as any);
      subscribeArtPiezaReport(() => {
        // fuerza re-render cuando cambie el reporte
        update();
      });
    }

    const report = getArtPiezaReport();

    return BUI.html`
      <bim-panel-section fixed label="ART_Pieza" icon="mdi:format-list-bulleted">
        ${report.length === 0
          ? BUI.html`
              <bim-label icon="ph:warning-fill">
                No hay datos de ART_Pieza
              </bim-label>
            `
          : BUI.html`
              <div style="display:flex; flex-direction:column; gap:4px; padding:8px; font-size:13px;">
                ${report.map(
                  (r) => BUI.html`
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--bim-ui_bg-contrast-20); padding:4px 0;">
                      <span>${r.artPieza}</span>
                      <span style="opacity:0.8">${r.count}</span>
                    </div>
                  `,
                )}
              </div>
            `}
      </bim-panel-section>
    `;
  };
