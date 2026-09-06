import { createPinia } from 'pinia'
import piniaPluginPersist  from 'pinia-plugin-persist'
const store = createPinia()
store.use(piniaPluginPersist)
import { useUserStore } from './user'
import { useComStore } from './com'
import { useFrontStore } from './app'
export {
    store,
    useUserStore,
    useComStore,
    useFrontStore
}