(function () {
  'use strict';

  var logger = {
    log: function () { console.log.apply(console, ["[TMDB proxy]"].concat(Array.prototype.slice.call(arguments))); },
    warn: function () { console.warn.apply(console, ["[TMDB proxy]"].concat(Array.prototype.slice.call(arguments))); },
    error: function () { console.error.apply(console, ["[TMDB proxy]"].concat(Array.prototype.slice.call(arguments))); }
  };

  var unic_id = Lampa.Storage.get('lampac_unic_id', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', unic_id);
  }

  var CACHE_TTL = 5 * 60 * 1000;

  var MIRRORS = {
    img: [
      { host: '89.110.97.220',    port: '10254', path: 'tmdb/img' },
      { host: '91.184.245.56',    port: '9215',  path: 'tmdb/img' },
      { host: '144.124.225.106',  port: '11310', path: 'tmdb/img' },
      { host: '78.40.199.67',     port: '10630', path: 'tmdb/img' },
      { host: 'smotret24.com',           path: 'tmdb/img' },
      { host: 'ab2024.ru',               path: 'tmdb/img' },
      { host: 'lam.akter-black.com',     path: 'tmdb/img' },
      { host: 'lam2.akter-black.com',    path: 'tmdb/img' },
      { host: 'nl.imagetmdb.com',        path: '' },
      { host: 'pl.imagetmdb.com',        path: '' },
      { host: 'de.imagetmdb.com',        path: '' },
    ],
    api: [
      { host: '89.110.97.220',    port: '10254', path: 'tmdb/api/3' },
      { host: '91.184.245.56',    port: '9215',  path: 'tmdb/api/3' },
      { host: '144.124.225.106',  port: '11310', path: 'tmdb/api/3' },
      { host: '78.40.199.67',     port: '10630', path: 'tmdb/api/3' },
      { host: 'smotret24.com',           path: 'tmdb/api/3' },
      { host: 'ab2024.ru',               path: 'tmdb/api/3' },
      { host: 'lam.akter-black.com',     path: 'tmdb/api/3' },
      { host: 'lam2.akter-black.com',    path: 'tmdb/api/3' },
      { host: 'apitmdb.cubnotrip.top',   path: '3' },
    ]
  };

  var STATUS = {};
  var USE_DIRECT = false;
  var FINAL_IMG_PROXY = '—';
  var FINAL_API_PROXY = '—';

  function initStatus() {
    MIRRORS.img.forEach(function(m, i) { STATUS['img_'+i] = {ok:null, ts:0}; });
    MIRRORS.api.forEach(function(m, i) { STATUS['api_'+i] = {ok:null, ts:0}; });
    STATUS.direct_api = {ok:null, ts:0};
    STATUS.direct_img = {ok:null, ts:0};
  }

  function check(type, mirror, index, callback) {
    var now = Date.now();
    var key = type + '_' + index;
    if (STATUS[key].ok !== null && now - STATUS[key].ts < CACHE_TTL) {
      return callback(STATUS[key].ok);
    }

    var testPath = type === 'img'
      ? 't/p/w92/wwemzKWzjKYJFfCeiB57q3r4Bcm.png'
      : '3/configuration';

    var host = mirror.port ? mirror.host + ':' + mirror.port : mirror.host;
    var url = 'https://' + host + '/' + (mirror.path ? mirror.path + '/' : '') + testPath;

    var controller = new AbortController();
    var timeout = setTimeout(() => controller.abort(), 7500);

    fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
      cache: 'no-cache'
    })
    .then(() => {
      STATUS[key] = {ok: true, ts: now};
      callback(true);
    })
    .catch(() => {
      STATUS[key] = {ok: false, ts: now};
      callback(false);
    })
    .finally(() => clearTimeout(timeout));
  }

  function addAccount(url) {
    var email = Lampa.Storage.get('account_email', '');
    if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(unic_id));
    return url;
  }

  Lampa.TMDB.image = function (url) {
    var path = url.replace(/^\/+/, '');

    if (USE_DIRECT || !Lampa.Storage.field('proxy_tmdb')) {
      return 'https://image.tmdb.org/' + path;
    }

    for (var i = 0; i < MIRRORS.img.length; i++) {
      if (STATUS['img_' + i]?.ok) {
        var m = MIRRORS.img[i];
        var host = m.port ? m.host + ':' + m.port : m.host;
        return 'https://' + host + '/' + (m.path ? m.path + '/' : '') + path;
      }
