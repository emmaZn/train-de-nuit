import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { poserLangue, premiere } from './i18n/langue'
import { brancherVoyage, createAppRouter } from './router'
import './styles/base.css'

// Le script de tête d'`index.html` l'a déjà posée ; on la repose ici pour
// que l'application ne dépende pas de lui.
poserLangue(premiere())

const app = createApp(App)
app.use(createPinia())

const router = createAppRouter()
brancherVoyage(router)
app.use(router)

app.mount('#app')
