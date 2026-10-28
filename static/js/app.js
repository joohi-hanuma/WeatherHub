const $ = (selector) => document.querySelector(selector);
const api = async (url, options = {}) => {
  let response;
  try { response = await fetch(url, { headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, ...options }); }
  catch { throw new Error('Unable to reach WeatherHub. Check that the server is running.'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('The server returned an unreadable response.'); }
  if (!response.ok || payload.success === false) throw new Error(payload.error || 'Something went wrong. Please try again.');
  return payload;
};
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const iconUrl = (icon, size = '2x') => `https://openweathermap.org/img/wn/${encodeURIComponent(icon || '01d')}@${size}.png`;
let selectedOffset = 0;
const cityCache = new Map();
function notify(message, type = 'error') {
  const box = $('#notice'); box.textContent = message; box.className = `notice ${type}`; box.hidden = false;
  clearTimeout(notify.timer); notify.timer = setTimeout(() => { box.hidden = true; }, 5200);
}
function setBusy(button, busy, label = '') {
  if (!button) return;
  if (busy) { button.dataset.original = button.innerHTML; button.disabled = true; button.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>${label ? ` ${label}` : ''}`; }
  else { button.disabled = false; if (button.dataset.original) button.innerHTML = button.dataset.original; }
}
function updateClock() {
  const now = new Date(Date.now() + selectedOffset * 1000);
  $('#clock-date').textContent = new Intl.DateTimeFormat(undefined, { weekday:'short', day:'numeric', month:'short', year:'numeric', timeZone:'UTC' }).format(now);
  $('#clock-time').textContent = new Intl.DateTimeFormat(undefined, { hour:'numeric', minute:'2-digit', timeZone:'UTC' }).format(now);
}
function describeLocation(country) {
  const names = { IN:'India', US:'United States', GB:'United Kingdom', JP:'Japan', AU:'Australia', CA:'Canada', DE:'Germany', FR:'France', SG:'Singapore', AE:'United Arab Emirates' };
  return names[country] || country || 'Selected location';
}
function formatVisibility(meters) { return meters == null ? '—' : (meters / 1000).toFixed(meters % 1000 ? 1 : 0); }
async function searchWeather(city, country = '') {
  city = city.trim(); country = country.trim().toUpperCase();
  if (!city) { notify('Enter a city name to search.'); $('#city-input').focus(); return; }
  const button = $('#search-form').querySelector('.search-button'); setBusy(button, true, 'Searching');
  $('#weather-description').textContent = 'Loading current weather…';
  $('#forecast-list').innerHTML = '<div class="forecast-loading"><span class="spinner-border spinner-border-sm"></span> Loading five-day forecast…</div>';
  try {
    const query = new URLSearchParams({ city }); if (country) query.set('country', country);
    const [weather, forecast] = await Promise.all([api(`/api/weather/current?${query}`), api(`/api/weather/forecast?${query}`)]);
    renderWeather(weather.data); renderForecast(forecast.data || []);
    const resolved = weather.data.country || country;
    $('#country-input').value = resolved;
    notify(`Weather updated for ${weather.data.city}${resolved ? `, ${resolved}` : ''}.`, 'success');
  } catch (error) {
    notify(error.message); $('#weather-description').textContent = 'Weather unavailable';
    $('#forecast-list').innerHTML = '<div class="forecast-loading">Forecast unavailable for this search.</div>';
  } finally { setBusy(button, false); }
}
function renderWeather(data) {
  selectedOffset = Number(data.timezone) || 0;
  const country = data.country || '';
  $('#weather-city').innerHTML = `${safe(data.city)}${country ? `, <small>${safe(country)}</small>` : ''}`;
  $('#weather-location').textContent = describeLocation(country);
  $('#temperature').textContent = data.temperature == null ? '—' : Number(data.temperature).toFixed(1);
  $('#weather-description').textContent = data.description || 'Conditions unavailable';
  const feels = data.feels_like == null ? '—' : `${Number(data.feels_like).toFixed(1)}°C`;
  $('#feels-like span').textContent = `Feels like ${feels}`; $('#metric-feels').textContent = feels;
  $('#humidity').textContent = data.humidity ?? '—';
  $('#wind').textContent = data.wind_speed == null ? '—' : Number(data.wind_speed).toFixed(1);
  $('#pressure').textContent = data.pressure ?? '—'; $('#visibility').textContent = formatVisibility(data.visibility);
  const icon = $('#weather-icon'); icon.src = iconUrl(data.icon, '4x'); icon.alt = data.description || 'Weather condition'; icon.hidden = false;
  updateClock();
  $('#weather-date').textContent = new Intl.DateTimeFormat(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(Date.now() + selectedOffset * 1000)) + ' · ' + new Intl.DateTimeFormat(undefined, { hour:'numeric', minute:'2-digit', timeZone:'UTC' }).format(new Date(Date.now() + selectedOffset * 1000));
}
function renderForecast(entries) {
  if (!entries.length) { $('#forecast-list').innerHTML = '<div class="forecast-loading">No forecast entries are available.</div>'; return; }
  const groups = new Map();
  for (const entry of entries) {
    if (!entry.datetime) continue;
    const date = entry.datetime.slice(0, 10); if (!groups.has(date)) groups.set(date, []); groups.get(date).push(entry);
  }
  const days = [...groups.entries()].slice(0, 5);
  $('#forecast-list').innerHTML = days.map(([date, readings], index) => {
    const selected = readings.find(item => item.datetime.includes('12:00:00')) || readings[Math.floor(readings.length / 2)];
    const temps = readings.map(item => Number(item.temperature)).filter(Number.isFinite);
    const high = temps.length ? Math.round(Math.max(...temps)) : '—';
    const low = temps.length ? Math.round(Math.min(...temps)) : '—';
    const day = new Date(`${date}T12:00:00`);
    const label = new Intl.DateTimeFormat(undefined, { weekday:'short', timeZone:'UTC' }).format(day);
    const dateLabel = new Intl.DateTimeFormat(undefined, { day:'2-digit', month:'short', timeZone:'UTC' }).format(day);
    const rain = Math.round((Number(selected.precipitation_probability) || 0) * 100);
    return `<article class="forecast-card${index === 0 ? ' today-card' : ''}"><div class="forecast-day">${label}</div><div class="forecast-date">${dateLabel}</div><img src="${iconUrl(selected.icon)}" alt="${safe(selected.description)}" loading="lazy"><div class="forecast-temp-range"><span class="forecast-high">${high}°</span><span class="forecast-sep">/</span><span class="forecast-low">${low}°</span></div><div class="forecast-desc" title="${safe(selected.description)}">${safe(selected.description || '—')}</div><div class="forecast-pop"><i class="bi bi-droplet-fill"></i>${rain}%</div></article>`;
  }).join('');
}
const worldCities = [
  { city:'New York', country:'US', image:'new-york.jpg', label:'New York, US' },
  { city:'London', country:'GB', image:'london.jpg', label:'London, GB' },
  { city:'Tokyo', country:'JP', image:'tokyo.jpg', label:'Tokyo, JP' },
  { city:'Sydney', country:'AU', image:'sydney.jpg', label:'Sydney, AU' }
];
async function loadWorldWeather() {
  $('#world-list').innerHTML = worldCities.map(item => `<article class="world-row" data-city="${safe(item.city)}" data-country="${item.country}"><img class="world-photo" src="/static/img/${item.image}" alt="${safe(item.city)} landmark"><div class="world-city">${safe(item.label)}<small class="world-country">${item.country}</small></div><img class="world-icon" src="${iconUrl('01d')}" alt=""><div class="world-weather"><strong>—</strong><small>Loading</small></div><i class="bi bi-chevron-right world-chevron"></i></article>`).join('');
  await Promise.all(worldCities.map(async item => {
    try {
      const result = await api(`/api/weather/current?city=${encodeURIComponent(item.city)}&country=${item.country}`); const data = result.data;
      const row = $(`.world-row[data-city="${CSS.escape(item.city)}"]`); if (!row) return;
      row.querySelector('.world-icon').src = iconUrl(data.icon);
      row.querySelector('.world-weather strong').textContent = `${Math.round(data.temperature)}°C`;
      row.querySelector('.world-weather small').textContent = data.description || '—';
      row.querySelector('.world-country').textContent = item.country;
      cityCache.set(`${item.city},${item.country}`, data);
    } catch {
      const row = $(`.world-row[data-city="${CSS.escape(item.city)}"]`); if (row) row.querySelector('.world-weather small').textContent = 'Unavailable';
    }
  }));
}
function favoriteWeather(city,country) {
  const cacheKey = `${city},${country}`;
  if (cityCache.has(cacheKey)) return Promise.resolve(cityCache.get(cacheKey));
  const query = new URLSearchParams({city,country});
  return api(`/api/weather/current?${query}`).then(result => { cityCache.set(cacheKey,result.data); return result.data; });
}
async function loadFavorites() {
  const list = $('#favorites-list');
  try {
    const result = await api('/api/favorites');
    if (!result.data?.length) { list.innerHTML = '<div class="panel-empty">No favourite cities yet. Select “Add City” to save one.</div>'; return; }
    list.innerHTML = result.data.map(item => {
      const city=safe(item.city), country=safe(item.country), id=Number(item.id);
      return `<article class="favorite-row" data-id="${id}" data-city="${city}" data-country="${country}"><span class="favorite-condition-icon"><i class="bi bi-sun-fill"></i></span><button class="favorite-main favorite-place-btn" type="button" aria-label="View weather for ${city}"><strong>${city}</strong><small>${country}${item.nickname ? ` &nbsp;|&nbsp; ${safe(item.nickname)}` : ''}</small></button><img class="favorite-weather-icon" src="${iconUrl('01d')}" alt="Weather"><div class="favorite-temp"><strong>—</strong><small>Loading…</small></div><div class="favorite-actions"><button type="button" class="edit-favorite" aria-label="Edit ${city}"><i class="bi bi-pencil-fill"></i></button><button type="button" class="delete-favorite" aria-label="Delete ${city}"><i class="bi bi-trash-fill"></i></button></div></article>`;
    }).join('');
    for (const item of result.data) {
      const row = $(`.favorite-row[data-id="${Number(item.id)}"]`); if (!row) continue;
      favoriteWeather(item.city,item.country).then(data => {
        row.querySelector('.favorite-condition-icon').innerHTML = `<img src="${iconUrl(data.icon)}" alt="">`;
        row.querySelector('.favorite-weather-icon').src = iconUrl(data.icon);
        row.querySelector('.favorite-temp strong').textContent = `${Math.round(data.temperature)}°C`;
        row.querySelector('.favorite-temp small').textContent = data.description || '—';
      }).catch(() => { row.querySelector('.favorite-temp small').textContent = 'Weather unavailable'; });
    }
  } catch {
    list.innerHTML = '<div class="panel-empty">Could not load favourites. Check your MySQL connection and refresh.</div>';
  }
}
function showModal(id) { bootstrap.Modal.getOrCreateInstance($(id)).show(); }
$('#search-form').addEventListener('submit', event => { event.preventDefault(); searchWeather($('#city-input').value,$('#country-input').value); });
$('#favorite-form').addEventListener('submit', async event => {
  event.preventDefault(); const button=event.currentTarget.querySelector('[type="submit"]'); setBusy(button,true,'Saving'); $('#favorite-form-error').textContent='';
  const body={city:$('#favorite-city').value.trim(),country:$('#favorite-country').value.trim().toUpperCase(),nickname:$('#favorite-nickname').value.trim()};
  if (!body.city || !/^[A-Z]{2}$/.test(body.country)) { $('#favorite-form-error').textContent='Enter a city and a valid two-letter country code.';setBusy(button,false);return; }
  try { await api('/api/favorites',{method:'POST',body:JSON.stringify(body)});bootstrap.Modal.getInstance($('#favoriteModal')).hide();event.currentTarget.reset();await loadFavorites();notify('Favourite city added.','success'); }
  catch(error){$('#favorite-form-error').textContent=error.message;} finally{setBusy(button,false);}
});
$('#edit-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('[type="submit"]');setBusy(button,true,'Saving');$('#edit-form-error').textContent='';
  const id=Number($('#edit-id').value),body={city:$('#edit-city').value.trim(),country:$('#edit-country').value.trim().toUpperCase(),nickname:$('#edit-nickname').value.trim()};
  if(!body.city||!/^[A-Z]{2}$/.test(body.country)){$('#edit-form-error').textContent='Enter a city and a valid two-letter country code.';setBusy(button,false);return;}
  try{await api(`/api/favorites/${id}`,{method:'PUT',body:JSON.stringify(body)});bootstrap.Modal.getInstance($('#editModal')).hide();await loadFavorites();notify('Favourite city updated.','success');}
  catch(error){$('#edit-form-error').textContent=error.message;}finally{setBusy(button,false);}
});
$('#favorites-list').addEventListener('click',async event=>{
  const row=event.target.closest('.favorite-row');if(!row)return;const id=Number(row.dataset.id),city=row.dataset.city,country=row.dataset.country;
  if(event.target.closest('.favorite-place-btn')){ $('#city-input').value=city;$('#country-input').value=country;searchWeather(city,country);window.scrollTo({top:0,behavior:'smooth'});return; }
  if(event.target.closest('.edit-favorite')){ $('#edit-id').value=id;$('#edit-city').value=city;$('#edit-country').value=country;$('#edit-nickname').value=row.querySelector('.favorite-main small').textContent.split('|').slice(1).join('|').trim();$('#edit-form-error').textContent='';showModal('#editModal');return; }
  if(event.target.closest('.delete-favorite')){if(!confirm(`Remove ${city} from Favourite Cities?`))return;const button=row.querySelector('.delete-favorite');setBusy(button,true);try{await api(`/api/favorites/${id}`,{method:'DELETE'});await loadFavorites();notify(`${city} removed from favourites.`,'success');}catch(error){setBusy(button,false);notify(error.message);}}
});
$('#world-list').addEventListener('click',event=>{const row=event.target.closest('.world-row');if(!row)return;const city=row.dataset.city,country=row.dataset.country;$('#city-input').value=city;$('#country-input').value=country;searchWeather(city,country);window.scrollTo({top:0,behavior:'smooth'});});
$('#view-all-favorites').addEventListener('click',()=>$('#favorites').scrollIntoView({behavior:'smooth',block:'start'}));
$('#map-button').addEventListener('click',()=>window.open('https://openweathermap.org/weathermap','_blank','noopener'));
$('#theme-toggle').addEventListener('click',()=>{const light=document.body.classList.toggle('light-theme');localStorage.setItem('weatherhub-theme',light?'light':'dark');$('#theme-toggle').classList.toggle('light-active',light);});
if(localStorage.getItem('weatherhub-theme')==='light'){document.body.classList.add('light-theme');$('#theme-toggle').classList.add('light-active');}
$('#city-input').value='Vijayawada';
$('#country-input').value='IN';
updateClock();setInterval(updateClock,15000);
loadFavorites();loadWorldWeather();searchWeather('Vijayawada','IN');
