const $ = (selector) => document.querySelector(selector);
const datePicker = $('#date-picker');
const tripList = $('#trip-list');
const dialog = $('#trip-dialog');
const form = $('#trip-form');
const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

const pad = (value) => String(value).padStart(2, '0');
const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const pluralTrips = (count) => {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} поездок`;
  if (last === 1) return `${count} поездка`;
  if (last >= 2 && last <= 4) return `${count} поездки`;
  return `${count} поездок`;
};
const formatMoney = (value) => `${money.format(value)} ₸`;
const formatTime = (iso) => iso.slice(11, 16);
const duration = (start, end) => `${Math.round((Date.parse(end) - Date.parse(start)) / 60000)} мин`;

function setDate(value) {
  datePicker.value = value;
  const date = new Date(`${value}T12:00:00`);
  $('#pretty-date').textContent = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
  loadDay();
}

function shiftDate(days) {
  const date = new Date(`${datePicker.value}T12:00:00`);
  date.setDate(date.getDate() + days);
  setDate(localDate(date));
}

function renderSummary(summary) {
  $('#trip-count').textContent = pluralTrips(summary.tripCount);
  $('#net').textContent = formatMoney(summary.net);
  $('#revenue').textContent = formatMoney(summary.revenue);
  $('#commission').textContent = formatMoney(summary.commission);
  const rate = summary.revenue ? Math.round((summary.commission / summary.revenue) * 100) : 0;
  $('#commission-rate').textContent = `${rate}% от выручки`;
  for (const type of ['cash', 'card']) {
    $(`#${type}-amount`).textContent = formatMoney(summary.byPayment[type].amount);
    $(`#${type}-count`).textContent = summary.byPayment[type].count;
  }
}

function renderTrips(trips) {
  if (!trips.length) {
    tripList.innerHTML = '<div class="empty-state"><strong>В этот день поездок нет</strong>Добавьте первую поездку — сводка обновится автоматически.</div>';
    return;
  }
  tripList.innerHTML = trips.map((trip, index) => `
    <article class="trip-row">
      <span class="trip-index">${String(index + 1).padStart(2, '0')}</span>
      <div class="trip-time">
        <div>${formatTime(trip.start)}<small>начало</small></div><i></i>
        <div>${formatTime(trip.end)}<small>${duration(trip.start, trip.end)}</small></div>
      </div>
      <span class="trip-payment ${trip.payment}">${trip.payment === 'card' ? 'Карта' : 'Наличные'}</span>
      <span class="trip-amount">${formatMoney(trip.amount)}<small>− ${formatMoney(trip.commission)} комиссия</small></span>
      <span class="trip-arrow">›</span>
    </article>`).join('');
}

async function loadDay() {
  tripList.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const response = await fetch(`/api/day?date=${encodeURIComponent(datePicker.value)}`);
    if (!response.ok) throw new Error('Не удалось загрузить данные');
    const data = await response.json();
    renderSummary(data.summary);
    renderTrips(data.trips);
  } catch (error) {
    tripList.innerHTML = `<div class="empty-state"><strong>Что-то пошло не так</strong>${error.message}</div>`;
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}

$('#previous-day').addEventListener('click', () => shiftDate(-1));
$('#next-day').addEventListener('click', () => shiftDate(1));
datePicker.addEventListener('change', () => setDate(datePicker.value));
$('#open-form').addEventListener('click', () => {
  const start = `${datePicker.value}T09:00`;
  form.elements.start.value = start;
  form.elements.end.value = `${datePicker.value}T09:30`;
  $('#form-error').textContent = '';
  dialog.showModal();
});
$('#close-form').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = new FormData(form);
  const data = {
    id: globalThis.crypto.randomUUID(),
    start: `${fields.get('start')}:00+05:00`,
    end: `${fields.get('end')}:00+05:00`,
    amount: Number(fields.get('amount')),
    payment: fields.get('payment'),
    commission: Number(fields.get('commission'))
  };

  try {
    const response = await fetch('/api/trips', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.details?.join('. ') || result.error);
    dialog.close();
    form.reset();
    setDate(data.start.slice(0, 10));
    showToast(result.duplicate ? 'Такая поездка уже записана' : 'Поездка добавлена');
  } catch (error) {
    $('#form-error').textContent = error.message;
  }
});

setDate(new URLSearchParams(location.search).get('date') || '2026-10-01');
