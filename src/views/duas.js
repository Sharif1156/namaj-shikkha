/**
 * duas.js — filtered collection of duas and dhikr.
 */

import duasData from '../data/duas.json' with { type: 'json' };
import { el, esc } from '../ui/dom.js';
import { t } from '../core/i18n.js';

export function create(ctx) {
  const root = el('<div class="duas"></div>');
  let active = 'all';

  function build() {
    const locale = ctx.locale();
    const cats = [{ id: 'all', en: 'All', bn: 'সব' }, ...duasData.categories];
    const items = duasData.items.filter((d) => active === 'all' || d.category === active);

    root.innerHTML = `
      <h2 class="section-title" style="margin-top:6px;">${esc(t('duas.title'))}</h2>

      <div class="chips" role="tablist">
        ${cats
          .map(
            (c) => `<button class="chip" type="button" data-cat="${esc(c.id)}"
              aria-pressed="${active === c.id}">${esc(locale === 'bn' ? c.bn : c.en)}</button>`
          )
          .join('')}
      </div>

      <div data-items>
        ${items.map((d) => itemHtml(d, locale)).join('')}
      </div>

      <p class="muted-text" style="margin-top:18px;">${esc(duasData.meta.note)}</p>
    `;

    root.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        active = btn.dataset.cat;
        build();
      });
    });
  }

  function itemHtml(d, locale) {
    const title = locale === 'bn' ? d.title.bn : d.title.en;
    const meaning = d.meaning ? (locale === 'bn' ? d.meaning.bn : d.meaning.en) : '';
    const body = d.body ? (locale === 'bn' ? d.body.bn : d.body.en) : '';

    return `
      <article class="card">
        <div class="row-between" style="align-items:flex-start;">
          <h3 style="margin:0;font-size:15.5px;font-weight:700;">${esc(title)}</h3>
          ${d.repeat ? `<span class="badge">${esc(d.repeat)}</span>` : ''}
        </div>
        ${d.arabic ? `<p class="arabic" style="margin:12px 0 6px;">${esc(d.arabic)}</p>` : ''}
        ${d.translit ? `<p class="translit" style="margin:0 0 8px;">${esc(d.translit)}</p>` : ''}
        ${meaning ? `<p class="meaning" style="margin:0;">${esc(meaning)}</p>` : ''}
        ${body ? `<p class="meaning" style="margin:0;color:var(--text-muted);">${esc(body)}</p>` : ''}
        ${d.source ? `<p class="muted-text" style="margin:10px 0 0;font-size:11.5px;">${esc(t('duas.source'))}: ${esc(d.source)}</p>` : ''}
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
