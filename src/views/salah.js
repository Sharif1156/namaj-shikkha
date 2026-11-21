/**
 * salah.js — interactive wudu and salah guide.
 */

import salahData from '../data/salah.json' with { type: 'json' };
import { el, esc, digits } from '../ui/dom.js';
import { t } from '../core/i18n.js';

export function create(ctx) {
  const root = el('<div class="salah"></div>');
  let section = 'prayer';

  function build() {
    const locale = ctx.locale();
    const data = section === 'wudu' ? salahData.wudu : salahData.salah;
    const steps = data.steps;

    root.innerHTML = `
      <div class="segmented" style="margin:6px 0 4px;" role="tablist">
        <button type="button" data-section="wudu" aria-pressed="${section === 'wudu'}">${esc(t('salah.wudu'))}</button>
        <button type="button" data-section="prayer" aria-pressed="${section === 'prayer'}">${esc(t('salah.prayer'))}</button>
      </div>

      <h2 class="section-title" style="margin-top:14px;">${esc(locale === 'bn' ? data.title.bn : data.title.en)}</h2>
      <p class="muted-text" style="margin:0 4px 14px;">${esc(locale === 'bn' ? data.intro.bn : data.intro.en)}</p>

      <div data-steps>
        ${steps.map((s) => stepHtml(s, locale)).join('')}
      </div>
    `;

    root.querySelectorAll('[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        section = btn.dataset.section;
        build();
      });
    });
  }

  function stepHtml(step, locale) {
    const title = locale === 'bn' ? step.title.bn : step.title.en;
    const body = step.body
      ? `<p class="meaning" style="margin:10px 0 0;">${esc(locale === 'bn' ? step.body.bn : step.body.en)}</p>`
      : '';
    const arabic = step.arabic
      ? `<div class="step__arabic">
           <p class="arabic" style="margin:0;">${esc(step.arabic)}</p>
           ${step.translit ? `<p class="translit" style="margin:10px 0 0;">${esc(step.translit)}</p>` : ''}
         </div>`
      : '';
    const meaning = step.meaning
      ? `<p class="meaning" style="margin:8px 0 0;">${esc(locale === 'bn' ? step.meaning.bn : step.meaning.en)}</p>`
      : '';
    const repeat =
      step.repeat > 1
        ? `<p class="step__repeat">${esc(t('salah.repeat'))}: ${esc(digits(step.repeat, locale))} ${esc(t('salah.times'))}</p>`
        : '';
    const posture =
      step.posture
        ? `<span class="badge">${esc(t(`salah.posture.${step.posture}`))}</span>`
        : '';

    return `
      <article class="step">
        <div class="step__head">
          <span class="step__num">${esc(digits(step.n, locale))}</span>
          <h3 class="step__title">${esc(title)}</h3>
          ${posture}
        </div>
        ${body}
        ${arabic}
        ${meaning}
        ${repeat}
      </article>
    `;
  }

  build();

  return {
    root,
    refresh: build,
    tick: () => {},
  };
}
