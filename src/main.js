import { createApp } from 'vue'
import router from './router'
import App from './App'
// 全局引入
// import ElementPlus from 'element-plus'
// import 'element-plus/dist/index.css'

const app = createApp(App)

app.use(router)


// 全局引入
// app.use(ElementPlus)

app.mount(document.getElementById("app"))
 