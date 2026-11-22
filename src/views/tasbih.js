/**
 * tasbih.js — dhikr counter view.
 */

import { PRESETS, createState, increment, reset, progress, totalCount, selectPreset } from '../core/tasbih.js';
import * as storage from '../core/storage.js';
import { el, esc, digits, haptic, toast, qsa } from '../ui/dom.js';
import { t } from '../core/i18n.js';
import { get } from '../state.js';

export { PRESETS };

export function create(ctx) {
  const root = el('<div class="tasbih-wrap"></div>');
  let state = storage.get('tasbih', null) ?? createState();

  function save() {
    storage.set('tasbih', state);
  }

  function build() {
    const locale = ctx.locale();
    const preset = PRESETS.find((p) => p.id === state.presetId) ?? PRESETS[0];
    const pct = Math.round(progress(state) * 100);

    root.innerHTML = `
      <div style="width:100%;">
        <h2 class="section-title" style="margin-top:6px;">${esc(t('tasbih.title'))}</h2>
        <div class="chips" role="tablist">
          ${PRESETS.map(
            (p) => `<button class="chip" type="button" data-preset="${p.id}"
              aria-pressed="${p.id === state.presetId}">${esc(locale === 'bn' ? p.bn : p.translit)}</button>`
          ).join('')}
        </div>
      </div>

      <p class="arabic arabic--lg" style="margin:8px 0 0;text-align:center;">${esc(preset.arabic)}</p>
      <p class="muted-text" style="text-align:center;margin:4px 0 0;">${esc(locale === 'bn' ? preset.bn : preset.en)}</p>

      <button class="tasbih-dial" type="button" data-dial style="--p:${pct / 100}" aria-label="${esc(t('tasbih.tap'))}">
        <span class="tasbih-dial__inner">
          <span>
            <span class="tasbih-count" data-count>${esc(digits(state.count, locale))}</span>
            <span class="tasbih-target">${esc(digits(state.target, locale))}</span>
          </span>
        </span>
      </button>

      <p class="muted-text" style="text-align:center;margin:0;">${esc(t('tasbih.tap'))}</p>

      <div style="display:flex;gap:10px;width:100%;max-width:320px;">
        <button class="btn btn--ghost btn--block" type="button" data-action="reset">${esc(t('tasbih.reset'))}</button>
        <button class="btn btn--block" type="button" data-action="rounds" data-total disabled>
          ${esc(t('tasbih.total'))}: ${esc(digits(totalCount(state), locale))}
        </button>
      </div>
    `;

    root.querySelector('[data-dial]')?.addEventListener('click', onCount);
    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      state = reset(state);
      save();
      haptic(get().haptics, 18);
      build();
    });
    qsa(root, '[data-preset]').forEach((btn) =>
      btn.addEventListener('click', () => {
        state = selectPreset(state, btn.dataset.preset);
        save();
        build();
      })
    );
  }

  function onCount() {
    const prevRounds = state.rounds ?? 0;
    const result = increment(state);
    state = result.state;
    save();

    haptic(get().haptics, result.completedRound ? [24, 40, 24] : 10);

    const countEl = root.querySelector('[data-count]');
    const locale = ctx.locale();
    if (countEl) countEl.textContent = digits(state.count, locale);

    const dial = root.querySelector('[data-dial]');
    if (dial) dial.style.setProperty('--p', progress(state));

    // Keep the labelled total in sync too; it used to show the pre-round
    // value until the view was rebuilt.
    const totalEl = root.querySelector('[data-total]');
    if (totalEl) totalEl.textContent = `${t('tasbih.total')}: ${digits(totalCount(state), locale)}`;

    if (result.completedRound) {
      toast(t('tasbih.complete'));
    }
  }

  build();

  return {
    root,
    refresh: build,
    tick: () => {},
  };
}
