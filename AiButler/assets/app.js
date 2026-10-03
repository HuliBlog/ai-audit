/* Mg Intelligence Home - минимальный клиентский слой для всей экосистемы (главная + 3 B2B-страницы):
   sticky CTA, демо-сцена, форма.
   Ключей и токенов здесь нет: аналитика подключается позже через window.mgAiButlerAnalytics. */
(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- analytics hook (placeholder, реальный провайдер подключается при деплое) --- */
  function track(event, payload) {
    var sink = window.mgAiButlerAnalytics;
    if (typeof sink === 'function') {
      try { sink(event, payload || {}); } catch (e) { /* аналитика не должна ломать страницу */ }
    }
    (window.dataLayer = window.dataLayer || []).push(
      Object.assign({ event: event }, payload || {})
    );
  }
  window.mgAiButlerTrack = track;

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-analytics]');
    if (el) track('cta_click', { id: el.getAttribute('data-analytics'), lang: document.documentElement.lang });
  });

  /* --- sticky mobile CTA: показываем после hero --- */
  var sticky = document.querySelector('[data-sticky-cta]');
  var hero = document.querySelector('.hero');
  if (sticky && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        sticky.classList.toggle('is-visible', !entries[0].isIntersecting);
      },
      { rootMargin: '-40% 0px 0px 0px' }
    ).observe(hero);
  }

  /* --- live demo scene --- */
  var scene = document.querySelector('[data-scene]');
  if (scene) {
    var states = scene.querySelectorAll('.stage__state');
    var reply = scene.querySelector('.stage__reply');
    var timers = [];

    function resetScene() {
      timers.forEach(clearTimeout);
      timers = [];
      Array.prototype.forEach.call(states, function (s) { s.classList.remove('is-live'); });
      if (reply) reply.classList.remove('is-live');
    }

    function playScene() {
      resetScene();
      if (reduceMotion) {
        Array.prototype.forEach.call(states, function (s) { s.classList.add('is-live'); });
        if (reply) reply.classList.add('is-live');
        return;
      }
      Array.prototype.forEach.call(states, function (s, i) {
        timers.push(setTimeout(function () { s.classList.add('is-live'); }, 500 + i * 750));
      });
      timers.push(
        setTimeout(function () {
          if (reply) reply.classList.add('is-live');
        }, 600 + states.length * 750)
      );
    }

    var played = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting && !played) {
            played = true;
            playScene();
          }
        },
        { threshold: 0.35 }
      ).observe(scene);
    } else {
      playScene();
    }

    var replay = scene.querySelector('[data-scene-replay]');
    if (replay) {
      replay.addEventListener('click', function () {
        track('demo_scene_replay', {});
        playScene();
      });
    }
  }

  /* --- demo request form: без бэкенда шлём письмо, статус через aria-live --- */
  /* --- форма заявки: уходит в хаб Apps Script, хаб пишет Стасу в Telegram (@MgGlobalinfo_bot).
         event "call" = только пинг в Telegram, без почты, таблицы и сделки ИИзации. --- */
  var form = document.querySelector('[data-demo-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var submitBtn = form.querySelector('[type="submit"]');
    var isRu = (document.documentElement.lang || 'ru').indexOf('ru') === 0;
    var endpoint = form.getAttribute('data-endpoint');
    var tgHref = form.getAttribute('data-telegram') || 'https://t.me/stanistar888';
    var sending = false;

    function field(key) {
      var el = form.elements[key];
      return el ? el.value.toString().trim().slice(0, 1500) : '';
    }
    function labelOf(key) {
      var el = form.elements[key];
      var span = el && el.closest('label') && el.closest('label').querySelector('span');
      return span ? span.textContent.trim() : key;
    }
    function setStatus(text, withTg) {
      if (!status) return;
      status.textContent = text;
      if (withTg) {
        var a = document.createElement('a');
        a.href = tgHref;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = '@' + tgHref.split('/').pop();
        status.appendChild(a);
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var name = field('name');
      var contact = field('contact');
      if (!name || !contact) {
        setStatus(isRu ? 'Заполните имя и контакт.' : 'Please fill in name and contact.');
        return;
      }
      track('demo_request', { lang: document.documentElement.lang });

      var details = ['AiButler, заявка с сайта', 'Страница: ' + location.pathname];
      ['object', 'message'].forEach(function (key) {
        var v = field(key);
        if (v) details.push(labelOf(key) + ': ' + v);
      });

      var fail = function () {
        sending = false;
        if (submitBtn) submitBtn.disabled = false;
        setStatus(isRu ? 'Не получилось отправить. Напишите нам в Telegram: ' : 'Could not send. Message us on Telegram: ', true);
      };
      if (!endpoint || !window.fetch) { fail(); return; }

      sending = true;
      if (submitBtn) submitBtn.disabled = true;
      setStatus(isRu ? 'Отправляем...' : 'Sending...');
      // text/plain + no-cors: простой запрос без CORS-префлайта, Apps Script его принимает
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          event: 'call',
          source: 'aibutler', // метка для будущего отдельного бота заявок; хаб пока её не читает
          company: details.join('\n'),
          contactName: name,
          contactHandle: contact
        })
      }).then(function () {
        sending = false;
        form.reset();
        if (submitBtn) submitBtn.disabled = false;
        setStatus(isRu ? 'Заявка отправлена. Мы свяжемся с вами по указанному контакту.' : 'Request sent. We will get back to you at the contact you left.');
      }, fail);
    });
  }
  /* --- светлая / тёмная тема: тёмная по умолчанию, выбор запоминается --- */
  var themeBtn = document.querySelectorAll('[data-theme-toggle]');
  Array.prototype.forEach.call(themeBtn, function (btn) {
    btn.addEventListener('click', function () {
      var root = document.documentElement;
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('mg-theme', next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#f4f7fb' : '#060912');
    });
  });
})();
