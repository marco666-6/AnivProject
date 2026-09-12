/** Pilih Jalanmu — a walk back through their story, with choices. */
import api from '../api.js';

export default {
  id: 'adventure',
  name: 'Pilih Jalanmu',
  icon: '🗺️',
  tint: 'rgba(127,183,164,.32)',
  desc: 'Ulang cerita kita dari awal. Kamu yang milih jalannya.',
  scoring: 'high',
  scoreLabel: (v) => `${v} langkah dilewatin`,

  async mount(ctx) {
    const { root, el: E } = ctx;
    const story = await api.adventure();
    if (!story?.nodes) { root.append(E('p', { class: 'g-loading', text: 'Ceritanya belum ditulis.' })); return; }

    let steps = 0;
    const path = [];
    const stage = E('div', { class: 'adv' });
    const trail = E('div', { class: 'adv-trail' });
    root.append(stage, trail);

    function go(id) {
      const n = story.nodes[id];
      if (!n) return;
      steps++;
      path.push(n.title);

      trail.replaceChildren(...path.slice(-6).map((t, i, a) =>
        E('span', { class: `adv-step${i === a.length - 1 ? ' is-now' : ''}`, text: t })
      ));

      stage.replaceChildren(
        E('h4', { class: 'adv-title', text: n.title }),
        ...String(n.text).split('\n\n').map((p) => E('p', { class: 'adv-text', text: p })),
        n.end
          ? E('div', { class: 'adv-end' },
              E('p', { class: 'adv-fin', text: 'tamat — untuk tahun ini' }),
              E('button', { class: 'btn btn--quiet btn--sm', text: 'Ulang dari awal', onclick: () => { steps = 0; path.length = 0; go(story.start); } })
            )
          : E('div', { class: 'adv-choices' },
              ...(n.choices || []).map((c) =>
                E('button', { class: 'adv-choice', text: c.t, onclick: (e) => { ctx.burstAt(e, 3); go(c.to); } })
              )
            )
      );
      stage.scrollIntoView({ block: 'nearest' });

      if (n.end) ctx.finish({ score: steps, meta: { path } });
    }

    go(story.start);
  },
};
