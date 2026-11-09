
(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const msg = error => error?.message || String(error || 'Erro desconhecido');

  const fmtDate = value =>
    value ? new Date(value).toLocaleDateString('pt-BR') : '—';

  const money = (value, currency = 'USD') => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const n = Number(value);

    return Number.isFinite(n)
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: ['USD', 'EUR', 'BRL'].includes(currency)
            ? currency : 'USD'
        }).format(n)
      : '—';
  };

  let db = null;
  let user = null;
  let tab = 'dashboard';
  let contacts = [];
  let offers = [];
  let campaigns = [];
  let recipients = [];
  let selectedFiles = [];
  let busy = false;

  function notice(message = '') {
    $('notice').textContent = message;
  }

  function setBusy(value) {
    busy = value;

    const signIn = $('signin');

    if (signIn) {
      signIn.disabled = value;
      signIn.textContent = value ? 'Entrando…' : 'Entrar';
    }
  }

  function button(text, action, extra = '') {
    return `<button type="button" data-action="${action}" ${extra}>${text}</button>`;
  }

  function renderAuth() {
    $('login').classList.toggle('hide', !!user);
    $('app').classList.toggle('hide', !user);
    $('logout').classList.toggle('hide', !user);
  }

  function setTab(next) {
    tab = next;

    document.querySelectorAll('[data-tab]').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    render();
  }

  function render() {
    if (!user) return;

    const content = $('content');

    if (tab === 'dashboard') {
      content.innerHTML = `
        <div class="panel">
          <h1>Painel comercial</h1>
          <p class="muted">Bem-vindo, ${esc(user.email)}</p>

          <div class="grid">
            <div class="metric">Clientes<b>${contacts.length}</b></div>
            <div class="metric">Ofertas<b>${offers.length}</b></div>
            <div class="metric">Campanhas<b>${campaigns.length}</b></div>
          </div>
        </div>

        <div class="panel">
          <h2>Ações rápidas</h2>

          <div class="row">
            ${button('Nova oferta', 'new-offer')}
            ${button('Novo cliente', 'new-contact')}
            ${button('Fila WhatsApp', 'open-queue')}
          </div>
        </div>`;

    } else if (tab === 'contacts') {
      content.innerHTML = `
        <div class="panel">
          <h1>Clientes</h1>
          ${button('Adicionar cliente', 'new-contact')}
        </div>

        <div class="panel">
          ${contacts.length ? contacts.map(c => `
            <div class="item">
              <div>
                <strong>${esc(c.name || c.company || 'Cliente')}</strong>
                <div class="muted">${esc(c.company || '')} · ${esc(c.country || '')}</div>
                <div class="muted">${esc(c.email || '')} ${esc(c.phone || '')}</div>
              </div>

              <div class="row">
                ${button('Editar', 'edit-contact', `data-id="${esc(c.id)}"`)}
                ${button('Excluir', 'delete-contact', `data-id="${esc(c.id)}" class="secondary"`)}
              </div>
            </div>`).join('') :
          '<p class="muted">Nenhum cliente cadastrado.</p>'}
        </div>`;

    } else if (tab === 'offers') {
      content.innerHTML = `
        <div class="panel">
          <h1>Ofertas</h1>
          ${button('Criar oferta', 'new-offer')}
        </div>

        <div class="panel">
          ${offers.length ? offers.map(o => `
            <div class="item">
              <div>
                <strong>${esc(o.title || o.material || 'Oferta')}</strong>
                <div class="muted">${esc(o.material || '')} · ${money(o.price, o.currency)}</div>
                <div class="muted">${esc(o.status || 'rascunho')} · ${fmtDate(o.created_at)}</div>
              </div>

              <div class="row">
                ${button('Editar', 'edit-offer', `data-id="${esc(o.id)}"`)}
                ${button('WhatsApp', 'share-offer', `data-id="${esc(o.id)}"`)}
                ${button('Excluir', 'delete-offer', `data-id="${esc(o.id)}" class="secondary"`)}
              </div>
            </div>`).join('') :
          '<p class="muted">Nenhuma oferta cadastrada.</p>'}
        </div>`;

    } else if (tab === 'campaigns') {
      content.innerHTML = `
        <div class="panel">
          <h1>Campanhas</h1>
          ${button('Nova campanha', 'new-campaign')}
        </div>

        <div class="panel">
          ${campaigns.length ? campaigns.map(c => `
            <div class="item">
              <div>
                <strong>${esc(c.name || c.title || 'Campanha')}</strong>
                <div class="muted">${esc(c.status || 'rascunho')} · ${fmtDate(c.created_at)}</div>
              </div>

              ${button('Preparar WhatsApp', 'campaign-queue', `data-id="${esc(c.id)}"`)}
            </div>`).join('') :
          '<p class="muted">Nenhuma campanha cadastrada.</p>'}
        </div>`;

    } else if (tab === 'queue') {
      const available = contacts.filter(c => c.phone);

      content.innerHTML = `
        <div class="panel">
          <h1>Fila WhatsApp</h1>

          <p class="muted">
            Envio assistido: você revisa cada mensagem antes de enviá-la no WhatsApp.
            Não há disparo automático.
          </p>

          <label>Oferta
            <select id="queue-offer">
              <option value="">Selecione uma oferta</option>
              ${offers.map(o => `
                <option value="${esc(o.id)}">${esc(o.title || o.material)}</option>
              `).join('')}
            </select>
          </label>

          <label>Mensagem
            <textarea id="queue-message">Olá! Gostaria de compartilhar uma oferta comercial com você.</textarea>
          </label>

          <div class="row">
            ${button('Preparar mensagens', 'prepare-queue')}
          </div>
        </div>

        <div class="panel">
          <h2>Contatos com telefone (${available.length})</h2>

          <div id="queue-list">
            ${available.map(c => `
              <div class="item">
                <div>
                  <strong>${esc(c.name || c.company)}</strong>
                  <div class="muted">${esc(c.phone)}</div>
                </div>

                ${button('Abrir WhatsApp', 'send-contact', `data-id="${esc(c.id)}"`)}
              </div>
            `).join('') ||
            '<p class="muted">Cadastre clientes com telefone para começar.</p>'}
          </div>
        </div>`;
    }
  }

  async function load() {
    if (!user || !db) return;

    const names = [
      'contacts',
      'offers',
      'campaigns',
      'campaign_recipients'
    ];

    const results = await Promise.all(names.map(async name => {
      try {
        const { data, error } = await db
          .from(name)
          .select('*')
          .eq('user_id', user.id);

        return {
          name,
          data: data || [],
          error
        };

      } catch (error) {
        return {
          name,
          data: [],
          error
        };
      }
    }));

    [contacts, offers, campaigns, recipients] =
      results.map(r => r.data);

    render();

    const errors = results.filter(r => r.error);

    if (errors.length) {
      notice('Atenção: ' + errors.map(r =>
        `${r.name}: ${msg(r.error)}`
      ).join(' | '));
    } else {
      notice('');
    }
  }

  async function signIn() {
    if (busy || !db) return;

    const email = $('email').value.trim();
    const password = $('password').value;

    if (!email || !password) {
      return notice('Preencha e-mail e senha.');
    }

    setBusy(true);
    notice('Autenticando…');

    try {
      const { data, error } =
        await db.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      user = data.user;

      renderAuth();

      notice('Login realizado. Carregando dados…');

      await load();

    } catch (error) {
      notice('Falha no login: ' + msg(error));

    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await db.auth.signOut();

      if (error) throw error;

      user = null;
      contacts = [];
      offers = [];
      campaigns = [];
      recipients = [];
      selectedFiles = [];

      renderAuth();

      notice('Sessão encerrada.');

    } catch (error) {
      notice('Erro ao sair: ' + msg(error));
    }
  }

  function field(label, name, value = '', type = 'text') {
    return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;
  }

  function editor(title, body, action, id = '') {
    $('content').innerHTML = `
      <div class="panel">
        <h1>${title}</h1>

        <form id="editor-form" data-save="${action}" data-id="${esc(id)}">
          ${body}

          <div class="row">
            <button type="submit">Salvar</button>
            ${button('Cancelar', 'cancel', 'class="secondary"')}
          </div>
        </form>
      </div>`;
  }

  function contactEditor(c = {}) {
    setTab('contacts');

    editor(
      c.id ? 'Editar cliente' : 'Novo cliente',

      field('Nome', 'name', c.name) +
      field('Empresa', 'company', c.company) +
      field('Telefone com código do país', 'phone', c.phone, 'tel') +
      field('E-mail', 'email', c.email, 'email') +
      field('País', 'country', c.country) +

      `<label>Idioma
        <select name="language">
          <option value="PT" ${c.language === 'PT' ? 'selected' : ''}>Português</option>
          <option value="ES" ${c.language === 'ES' ? 'selected' : ''}>Español</option>
          <option value="EN" ${c.language === 'EN' ? 'selected' : ''}>English</option>
        </select>
      </label>

      <label>
        <input class="check" type="checkbox" name="consent" ${c.consent ? 'checked' : ''}>
        Autorização de contato registrada
      </label>`,

      'contact',
      c.id
    );
  }

  function offerEditor(o = {}) {
    setTab('offers');

    selectedFiles = [];

    editor(
      o.id ? 'Editar oferta' : 'Nova oferta',

      field('Título', 'title', o.title) +
      field('Material', 'material', o.material) +

      `<label>Descrição
        <textarea name="description">${esc(o.description)}</textarea>
      </label>` +

      field('Preço', 'price', o.price ?? '', 'number') +

      `<label>Moeda
        <select name="currency">
          ${['USD', 'EUR', 'BRL'].map(c =>
            `<option ${o.currency === c ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </label>` +

      `<label>Status
        <select name="status">
          ${['rascunho', 'ativa', 'encerrada'].map(s =>
            `<option ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </label>` +

      `<label>Fotos e vídeos (seleção local)
        <input
          id="media-files"
          type="file"
          accept="image/*,video/*"
          multiple
        >
      </label>

      <p class="muted" id="media-status">
        Os arquivos selecionados ainda não são armazenados no Supabase.
        Use o compartilhamento nativo para enviar as mídias.
      </p>

      ${button(
        'Compartilhar mídias selecionadas',
        'share-media',
        'class="secondary"'
      )}`,

      'offer',
      o.id
    );
  }

  function campaignEditor() {
    setTab('campaigns');

    editor(
      'Nova campanha',

      field('Nome da campanha', 'name') +
      `<p class="muted">
        Campanhas são salvas como rascunho.
        O envio pelo WhatsApp é manual.
      </p>`,

      'campaign'
    );
  }

  async function saveEditor(form) {
    const kind = form.dataset.save;
    const id = form.dataset.id;

    const values = Object.fromEntries(
      new FormData(form).entries()
    );

    let table;
    let payload;

    if (kind === 'contact') {
      table = 'contacts';

      payload = {
        name: values.name,
        company: values.company,
        phone: values.phone,
        email: values.email,
        country: values.country,
        language: values.language,
        consent: !!form.elements.consent.checked
      };

    } else if (kind === 'offer') {
      table = 'offers';

      payload = {
        title: values.title,
        material: values.material,
        description: values.description,
        price: values.price === ''
          ? null
          : Number(values.price),
        currency: values.currency,
        status: values.status
      };

    } else if (kind === 'campaign') {
      table = 'campaigns';

      payload = {
        name: values.name,
        status: 'rascunho'
      };

    } else {
      return;
    }

    if (!id) {
      payload.user_id = user.id;
    }

    const submit = form.querySelector('[type="submit"]');

    submit.disabled = true;

    try {
      const query = id
        ? db.from(table)
            .update(payload)
            .eq('id', id)
            .eq('user_id', user.id)
        : db.from(table)
            .insert(payload);

      const { error } = await query;

      if (error) throw error;

      selectedFiles = [];

      await load();

      notice('Registro salvo com sucesso.');

    } catch (error) {
      notice('Erro ao salvar: ' + msg(error));

    } finally {
      submit.disabled = false;
    }
  }

  async function deleteItem(table, id) {
    if (!confirm('Deseja realmente excluir este registro?')) {
      return;
    }

    try {
      const { error } = await db
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await load();

      notice('Registro excluído.');

    } catch (error) {
      notice('Erro ao excluir: ' + msg(error));
    }
  }

  function offerText(o) {
    return `${o.title || 'Oferta comercial'}
Material: ${o.material || '—'}
${o.description || ''}
Preço: ${money(o.price, o.currency)}`.trim();
  }

  function whatsapp(phone, message) {
    const digits = String(phone || '').replace(/\D/g, '');

    if (!digits) {
      return notice(
        'Cliente sem telefone válido. Inclua o código do país.'
      );
    }

    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  // ==========================================
  // COMPARTILHAMENTO DE FOTOS E VÍDEOS
  // COM TEXTO PERSONALIZADO DA OFERTA
  // ==========================================

  async function shareMedia() {
    if (!selectedFiles.length) {
      notice('Selecione fotos ou vídeos primeiro.');
      return;
    }

    const form = $('editor-form');

    if (!form) {
      notice('Editor da oferta não encontrado.');
      return;
    }

    const getValue = name =>
      form.elements.namedItem(name)?.value || '';

    const title = getValue('title');
    const material = getValue('material');
    const description = getValue('description');
    const price = getValue('price');
    const currency = getValue('currency') || 'USD';

    const message = [
      title || 'Oferta comercial',
      material ? `Material: ${material}` : '',
      description,
      price ? `Preço: ${money(price, currency)}` : ''
    ].filter(Boolean).join('\n\n');

    const files = [...selectedFiles];

    if (
      !navigator.share ||
      !navigator.canShare?.({ files })
    ) {
      notice(
        'O compartilhamento de arquivos não está disponível neste navegador.'
      );
      return;
    }

    // Tenta copiar o texto para permitir
    // colagem manual caso o WhatsApp
    // ignore a legenda dos arquivos.

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      }
    } catch (error) {
      console.warn(
        'Não foi possível copiar a mensagem:',
        error
      );
    }

    try {
      await navigator.share({
        files,
        text: message
      });

      notice(
        'Compartilhamento concluído no navegador. ' +
        'Confira se o WhatsApp incluiu a mensagem. ' +
        'Caso contrário, cole o texto manualmente.'
      );

    } catch (error) {
      if (error.name !== 'AbortError') {
        notice(
          'Falha ao compartilhar: ' + msg(error)
        );
      }
    }
  }

  // ==========================================
  // AÇÕES DO SISTEMA
  // ==========================================

  async function handleAction(el) {
    const action = el.dataset.action;
    const id = el.dataset.id;

    if (action === 'new-contact') {
      return contactEditor();
    }

    if (action === 'edit-contact') {
      return contactEditor(
        contacts.find(c => c.id === id)
      );
    }

    if (action === 'delete-contact') {
      return deleteItem('contacts', id);
    }

    if (action === 'new-offer') {
      return offerEditor();
    }

    if (action === 'edit-offer') {
      return offerEditor(
        offers.find(o => o.id === id)
      );
    }

    if (action === 'delete-offer') {
      return deleteItem('offers', id);
    }

    if (action === 'share-offer') {
      const offer = offers.find(o => o.id === id);

      if (offer) {
        const text = offerText(offer);

        if (navigator.share) {
          try {
            await navigator.share({ text });

          } catch (error) {
            if (error.name !== 'AbortError') {
              notice(msg(error));
            }
          }

        } else {
          try {
            await navigator.clipboard.writeText(text);
            notice('Oferta copiada. Cole no WhatsApp.');
          } catch (error) {
            notice('Não foi possível copiar: ' + msg(error));
          }
        }
      }

      return;
    }

    if (action === 'new-campaign') {
      return campaignEditor();
    }

    if (action === 'campaign-queue') {
      return setTab('queue');
    }

    if (action === 'open-queue') {
      return setTab('queue');
    }

    if (action === 'cancel') {
      selectedFiles = [];
      return render();
    }

    if (action === 'share-media') {
      return shareMedia();
    }

    if (action === 'prepare-queue') {
      return notice(
        'Selecione uma oferta e abra cada contato no WhatsApp para revisar e enviar.'
      );
    }

    if (action === 'send-contact') {
      const contact = contacts.find(c => c.id === id);

      const offer = offers.find(
        o => o.id === $('queue-offer')?.value
      );

      const intro =
        $('queue-message')?.value || 'Olá!';

      if (contact) {
        whatsapp(
          contact.phone,
          `${intro}\n\n${offer ? offerText(offer) : ''}`.trim()
        );
      }

      return;
    }
  }

  // ==========================================
  // INICIALIZAÇÃO E SUPABASE
  // ==========================================

  async function init() {
    try {
      if (!window.supabase?.createClient) {
        throw new Error(
          'Biblioteca Supabase não carregou. Verifique a conexão e o bloqueio de scripts.'
        );
      }

      const url = window.APP_CONFIG?.SUPABASE_URL;
      const key = window.APP_CONFIG?.SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error(
          'Configuração ausente em config.js (SUPABASE_URL / SUPABASE_ANON_KEY).'
        );
      }

      db = window.supabase.createClient(url, key);

      $('signin').addEventListener('click', signIn);

      $('password').addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          signIn();
        }
      });

      $('email').addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          signIn();
        }
      });

      $('logout').addEventListener('click', signOut);

      $('nav').addEventListener('click', event => {
        const el = event.target.closest('[data-tab]');

        if (el) {
          setTab(el.dataset.tab);
        }
      });

      $('content').addEventListener('click', event => {
        const el = event.target.closest('[data-action]');

        if (el) {
          handleAction(el);
        }
      });

      $('content').addEventListener('submit', event => {
        if (event.target.id === 'editor-form') {
          event.preventDefault();
          saveEditor(event.target);
        }
      });

      $('content').addEventListener('change', event => {
        if (event.target.id === 'media-files') {
          selectedFiles = Array.from(
            event.target.files || []
          );

          const status = $('media-status');

          if (status) {
            status.textContent =
              `${selectedFiles.length} arquivo(s) selecionado(s). ` +
              'Ainda não armazenados no servidor.';
          }
        }
      });

      const { data, error } =
        await db.auth.getSession();

      if (error) throw error;

      user = data.session?.user || null;

      renderAuth();

      if (user) {
        await load();
      }

      db.auth.onAuthStateChange((_event, session) => {
        const previous = user?.id;

        user = session?.user || null;

        renderAuth();

        if (user && previous !== user.id) {
          setTimeout(() => load(), 0);
        }
      });

    } catch (error) {
      notice('Erro ao iniciar: ' + msg(error));

      console.error('Offer Studio:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

})();
