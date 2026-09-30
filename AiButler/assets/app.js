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
  var form = document.querySelector('[data-demo-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var isRu = (document.documentElement.lang || 'ru').indexOf('ru') === 0;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var contact = (data.get('contact') || '').toString().trim();
      if (!name || !contact) {
        if (status) status.textContent = isRu ? 'Заполните имя и контакт.' : 'Please fill in name and contact.';
        return;
      }
      track('demo_request', { lang: document.documentElement.lang });
      var pageTitle = (document.title || 'Mg Intelligence Home').split(' - ')[0];
      var subject = pageTitle + (isRu ? ' - заявка с сайта' : ' - website inquiry');
      var body = [
        (isRu ? 'Имя: ' : 'Name: ') + name,
        (isRu ? 'Контакт: ' : 'Contact: ') + contact,
        (isRu ? 'Объект: ' : 'Property: ') + ((data.get('object') || '').toString().trim()),
        '',
        (data.get('message') || '').toString().trim()
      ].join('\n');
      window.location.href =
        'mailto:info@maizongroup.com?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(body);
      if (status) {
        status.textContent = isRu
          ? 'Открываем почтовый клиент. Если не открылся, напишите на info@maizongroup.com.'
          : 'Opening your mail client. If nothing happened, write to info@maizongroup.com.';
      }
    });
  }
})();
