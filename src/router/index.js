import { createRouter, createWebHistory } from 'vue-router'

const router =  createRouter({
    history: createWebHistory(),
    routes:[
        {
            name:'home',
            path:'/home',
            component: () => import('../views/Home')
        },
        {
            name:'about',
            path:'/about',
            component: () => import('../views/About')
        },
        {
            path:'/',
            component: () => import('../views/Home')
        },
    ]
})

export default router