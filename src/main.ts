import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { brancherVoyage, createAppRouter } from './router'
import './styles/base.css'

const app = createApp(App)
app.use(createPinia())

const router = createAppRouter()
brancherVoyage(router)
app.use(router)

app.mount('#app')
