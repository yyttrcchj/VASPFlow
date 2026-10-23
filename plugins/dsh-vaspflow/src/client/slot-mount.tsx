/**
 * dsh-vaspflow client: DSH 0.2.x slot-based mounting.
 *
 * DSH 0.2 replaced the old grid-track / self-healing-DOM mount technique with
 * a slot registry (`ctx.slots`). A plugin contributes:
 *
 *  - a sidebar nav row via the `sidebar.panellist` list slot;
 *  - a full main-area page via the `main` slot, keyed by the panel id, which
 *    the layout renders when `ctx.layout.selectPanel(id)` makes it active.
 *
 * This module owns both registrations. The legacy DOM mount in `layout.ts`
 * remains available as a fallback for hosts that do not expose `ctx.slots`.
 */
import React from 'react';

export const PANEL_ID = 'vaspflow';

/** Sidebar nav icon (small, currentColor, matches the shell's 16px seats). */
export function VaspPanelIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3.2" />
      <ellipse cx="8" cy="8" rx="7" ry="2.8" transform="rotate(-30 8 8)" />
      <path d="M8 4.8v6.4" />
    </svg>
  );
}

export interface SlotMountOptions {
  /** Render the dock panel body (already wrapped in ConfigProvider). */
  renderPanel: () => React.ReactElement;
  /** Panel label shown in the sidebar and page title. */
  label: string;
  /** Open/close state + toggle for the legacy fallback and the analyze flow. */
  isOpen: () => boolean;
  toggle: () => void;
  subscribe: (fn: () => void) => () => void;
}

export interface SlotMountApi {
  /** True when the slot-based mount took over; false means the caller should fall back. */
  mounted: boolean;
  dispose: () => void;
}

/**
 * Mount the VASP panel through DSH 0.2 slots.
 *
 * Registers the sidebar nav row and the main-area page. Returns
 * `{ mounted: false }` when the host does not expose the slot registry, so the
 * caller can use the legacy DOM mount instead.
 */
export function mountViaSlots(ctx: any, opts: SlotMountOptions): SlotMountApi {
  const slots = ctx?.slots;
  if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
    return { mounted: false, dispose: () => {} };
  }

  const disposers: Array<() => void> = [];

  // Main-area page: the shell renders this when the panel id is active.
  try {
    const disposeMain = slots.inject('main', () => slots.register({
      name: 'main',
      key: PANEL_ID,
    }, function VaspFlowPage() {
      // The main slot hands an unstyled block with no definite height; give the
      // panel a full-height flex host so its internal `height:100%` resolves.
      // The design CSS is scoped to `[data-dsh-vaspflow-panel]`; the slot path
      // must carry the same attribute the legacy DOM mount used to stamp, or
      // every panel rule (sizes, spacing, tokens) silently stops applying.
      return React.createElement('div', {
        'data-dsh-vaspflow-panel': '',
        style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' },
      }, opts.renderPanel());
    }));
    disposers.push(disposeMain);
  } catch (error) {
    console.error('[dsh-vaspflow] main slot registration failed:', error);
  }

  // Sidebar nav row: selecting it activates the page above.
  try {
    const disposeNav = slots.inject('sidebar.panellist', () => slots.register({
      name: 'sidebar.panellist',
      id: PANEL_ID,
      order: 20,
      label: opts.label,
    }, function VaspFlowNavIcon() {
      return React.createElement(VaspPanelIcon);
    }));
    disposers.push(disposeNav);
  } catch (error) {
    console.error('[dsh-vaspflow] sidebar.panellist registration failed:', error);
  }

  // Selecting the nav row must switch the main area to our page; when the
  // user navigates away, clear the selection so `panelStore.open` stays
  // truthful for the "分析此任务" flow.
  let unsubscribeStore: (() => void) | undefined;
  try {
    let wasOpen = opts.isOpen();
    unsubscribeStore = opts.subscribe(() => {
      const open = opts.isOpen();
      if (open === wasOpen) return;
      wasOpen = open;
      const layout = ctx.layout;
      try {
        layout?.selectPanel?.(open ? PANEL_ID : null);
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
  if (unsubscribeStore) disposers.push(unsubscribeStore);

  // Follow the shell's active panel so an external navigation (e.g. the user
  // clicking the conversation) closes the dock state as well.
  let unsubscribeLayout: (() => void) | undefined;
  try {
    const layout = ctx.layout;
    if (layout?.panelInfo?.subscribe) {
      const sync = () => {
        const active = layout.panelInfo.getSnapshot?.()?.activePanelId;
        const shouldOpen = active === PANEL_ID;
        if (shouldOpen !== opts.isOpen()) opts.toggle();
      };
      unsubscribeLayout = layout.panelInfo.subscribe(sync);
    }
  } catch {
    // Layout service shape differs; the nav row still works.
  }
  if (unsubscribeLayout) disposers.push(unsubscribeLayout);

  return {
    mounted: disposers.length > 0,
    dispose: () => {
      for (const dispose of disposers) {
        try { dispose(); } catch { /* ignore */ }
      }
    },
  };
}
