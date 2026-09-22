import './style.css'

const app = document.querySelector<HTMLElement>('#app')

if (!app) {
  throw new Error('Application root #app was not found.')
}

app.innerHTML = `
  <section class="starter" aria-labelledby="starter-title">
    <p class="starter__eyebrow">Session 003 · starter</p>
    <h1 id="starter-title">Rush Hour Crossing</h1>
    <p>The TypeScript and Canvas starter is ready. Gameplay has not been implemented yet.</p>
  </section>
`
