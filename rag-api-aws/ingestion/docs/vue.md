# Vue.js — Base de Conocimiento para Entrevistas Técnicas

## ¿Qué es este archivo y para qué sirve?

Este archivo es la fuente de conocimiento que el sistema RAG usa para generar preguntas de entrevista sobre Vue.js. El pipeline de ingestion lo divide en fragmentos (chunks), los convierte en vectores semánticos y los almacena en OpenSearch. Cuando un candidato selecciona Vue.js, el retriever busca los fragmentos más relevantes y el LLM los usa como contexto para crear preguntas reales de entrevista técnica.

---

## Reactividad en Vue 3

### Sistema reactivo con ref y reactive

Vue 3 introdujo la Composition API con un sistema de reactividad explícito. `ref()` envuelve valores primitivos en un objeto reactivo con una propiedad `.value`. `reactive()` convierte objetos completos en proxies reactivos. La diferencia clave es que `ref` puede contener cualquier tipo y es ideal para valores simples, mientras que `reactive` está pensado para objetos con múltiples propiedades relacionadas.

```javascript
import { ref, reactive, computed, watch } from 'vue'

// ref para primitivos
const contador = ref(0)
contador.value++ // Se accede con .value en script
// En template se usa directamente: {{ contador }}

// reactive para objetos
const usuario = reactive({
  nombre: 'Ana',
  edad: 28,
  activo: true
})
// No necesita .value: usuario.nombre = 'Carlos'
```

Un error común en entrevistas es confundir cuándo usar cada uno. Regla práctica: si el valor es primitivo (string, number, boolean), usa `ref`. Si es un objeto con múltiples propiedades que se relacionan entre sí, usa `reactive`.

### Computed properties

Las propiedades computadas son valores derivados del estado reactivo. Se recalculan automáticamente solo cuando sus dependencias cambian. Son cacheadas, lo que las hace más eficientes que los métodos si se llaman múltiples veces en el template.

```javascript
const precio = ref(100)
const descuento = ref(0.1)

const precioFinal = computed(() => precio.value * (1 - descuento.value))
// precioFinal.value → 90

// Computed con getter y setter
const nombreCompleto = computed({
  get: () => `${nombre.value} ${apellido.value}`,
  set: (valor) => {
    const partes = valor.split(' ')
    nombre.value = partes[0]
    apellido.value = partes[1]
  }
})
```

### Watchers

`watch` observa fuentes reactivas específicas y ejecuta un callback cuando cambian. `watchEffect` ejecuta el callback inmediatamente y rastrea automáticamente todas las dependencias reactivas accedidas dentro.

```javascript
// watch: control explícito
watch(contador, (nuevoValor, valorAnterior) => {
  console.log(`Cambió de ${valorAnterior} a ${nuevoValor}`)
})

// watch con múltiples fuentes
watch([nombre, apellido], ([nuevoNombre, nuevoApellido]) => {
  console.log(`Usuario: ${nuevoNombre} ${nuevoApellido}`)
})

// watchEffect: rastrea automáticamente
watchEffect(() => {
  // Cualquier ref/reactive accedido aquí es rastreado
  console.log(`Precio final: ${precioFinal.value}`)
})

// watch con opciones
watch(usuario, (nuevo) => {
  console.log('Usuario cambió:', nuevo)
}, { deep: true, immediate: true })
```

---

## Composition API vs Options API

### Options API (Vue 2 y Vue 3)

Organiza el código por tipo de opción (data, methods, computed, watch). Más intuitivo para principiantes pero puede volverse difícil de mantener en componentes grandes porque la lógica relacionada está dispersa.

```javascript
export default {
  name: 'MiComponente',
  data() {
    return { contador: 0, nombre: '' }
  },
  computed: {
    nombreMayusculas() { return this.nombre.toUpperCase() }
  },
  methods: {
    incrementar() { this.contador++ }
  },
  watch: {
    contador(nuevo) { console.log('Nuevo valor:', nuevo) }
  },
  mounted() { console.log('Componente montado') }
}
```

### Composition API (Vue 3 recomendado)

Organiza el código por funcionalidad lógica, no por tipo de opción. Permite extraer y reutilizar lógica como composables. Mejor soporte de TypeScript. Mejor tree-shaking.

```javascript
import { ref, computed, watch, onMounted } from 'vue'

export default {
  setup() {
    // Toda la lógica de "contador" junta
    const contador = ref(0)
    const incrementar = () => contador.value++
    watch(contador, (n) => console.log('Nuevo valor:', n))

    // Toda la lógica de "nombre" junta
    const nombre = ref('')
    const nombreMayusculas = computed(() => nombre.value.toUpperCase())

    onMounted(() => console.log('Componente montado'))

    return { contador, incrementar, nombre, nombreMayusculas }
  }
}
```

### Script Setup (sintaxis recomendada en Vue 3)

La forma más moderna y concisa. Todo lo declarado está automáticamente disponible en el template.

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'

const contador = ref(0)
const incrementar = () => contador.value++
const doble = computed(() => contador.value * 2)

onMounted(() => console.log('Listo'))
</script>

<template>
  <button @click="incrementar">{{ contador }} (doble: {{ doble }})</button>
</template>
```

---

## Composables — Reutilización de Lógica

Los composables son funciones que encapsulan y reutilizan lógica con estado reactivo. Son el equivalente de los custom hooks de React. Se nombran con prefijo `use` por convención.

### Composable básico: useFetch

```javascript
// composables/useFetch.js
import { ref, watch } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  const ejecutar = async () => {
    loading.value = true
    error.value = null
    try {
      const respuesta = await fetch(url.value ?? url)
      data.value = await respuesta.json()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Si url es reactivo, re-ejecutar al cambiar
  if (typeof url !== 'string') {
    watch(url, ejecutar, { immediate: true })
  } else {
    ejecutar()
  }

  return { data, error, loading, ejecutar }
}

// Uso en componente
const urlProducto = ref('/api/producto/1')
const { data: producto, loading, error } = useFetch(urlProducto)
```

### Composable con estado global: useContador

```javascript
// composables/useContador.js
import { ref, computed } from 'vue'

// Estado FUERA de la función = compartido entre componentes
const contadorGlobal = ref(0)

export function useContador(paso = 1) {
  const incrementar = () => contadorGlobal.value += paso
  const decrementar = () => contadorGlobal.value -= paso
  const resetear = () => contadorGlobal.value = 0
  const esPositivo = computed(() => contadorGlobal.value > 0)

  return { contador: contadorGlobal, incrementar, decrementar, resetear, esPositivo }
}
```

### Composable para formularios: useFormulario

```javascript
// composables/useFormulario.js
import { ref, reactive, computed } from 'vue'

export function useFormulario(camposIniciales, reglas = {}) {
  const campos = reactive({ ...camposIniciales })
  const errores = reactive({})
  const tocado = reactive({})

  const validar = () => {
    let esValido = true
    for (const [campo, regla] of Object.entries(reglas)) {
      const error = regla(campos[campo])
      if (error) {
        errores[campo] = error
        esValido = false
      } else {
        delete errores[campo]
      }
    }
    return esValido
  }

  const hayErrores = computed(() => Object.keys(errores).length > 0)

  const resetear = () => {
    Object.assign(campos, camposIniciales)
    Object.keys(errores).forEach(k => delete errores[k])
  }

  return { campos, errores, tocado, validar, hayErrores, resetear }
}

// Uso
const { campos, errores, validar, hayErrores } = useFormulario(
  { email: '', password: '' },
  {
    email: (v) => !v.includes('@') ? 'Email inválido' : null,
    password: (v) => v.length < 8 ? 'Mínimo 8 caracteres' : null
  }
)
```

---

## Ciclo de Vida de Componentes

El ciclo de vida define las fases por las que pasa un componente desde su creación hasta su destrucción. Entender el ciclo de vida es crítico para manejar efectos secundarios correctamente.

```
onBeforeMount  → DOM no disponible aún
onMounted      → DOM listo, ejecutar fetch, inicializar librerías externas
onBeforeUpdate → antes de re-render por cambio de estado
onUpdated      → después de re-render
onBeforeUnmount→ limpiar antes de destruir (cancelar subscripciones)
onUnmounted    → componente destruido, liberar recursos
```

```javascript
import { ref, onMounted, onUpdated, onBeforeUnmount, onUnmounted } from 'vue'

export default {
  setup() {
    const datos = ref([])
    let intervalo = null

    onMounted(async () => {
      // Correcto: fetch de datos cuando el DOM está listo
      datos.value = await fetch('/api/datos').then(r => r.json())
      
      // Intervalo que debe limpiarse al destruir
      intervalo = setInterval(() => {
        console.log('tick')
      }, 1000)
    })

    onBeforeUnmount(() => {
      // CRÍTICO: limpiar intervalos, event listeners, subscripciones
      clearInterval(intervalo)
    })

    return { datos }
  }
}
```

---

## Comunicación entre Componentes

### Props y Emits (padre → hijo, hijo → padre)

```vue
<!-- ComponenteHijo.vue -->
<script setup>
const props = defineProps({
  titulo: { type: String, required: true },
  cantidad: { type: Number, default: 0 },
  items: { type: Array, default: () => [] }
})

const emit = defineEmits(['actualizar', 'eliminar'])

const manejarClick = () => {
  emit('actualizar', { id: 1, valor: props.cantidad + 1 })
}
</script>

<!-- ComponentePadre.vue -->
<ComponenteHijo
  titulo="Mi Lista"
  :cantidad="totalItems"
  :items="listaItems"
  @actualizar="manejarActualizacion"
  @eliminar="manejarEliminacion"
/>
```

### Provide / Inject (comunicación a través de niveles)

Permite pasar datos a componentes descendientes sin prop drilling. Útil para temas, configuración global, o servicios compartidos.

```javascript
// Componente padre / raíz
import { provide, ref } from 'vue'

const tema = ref('claro')
const cambiarTema = () => { tema.value = tema.value === 'claro' ? 'oscuro' : 'claro' }

provide('tema', { tema, cambiarTema })

// Componente descendiente (cualquier nivel)
import { inject } from 'vue'

const { tema, cambiarTema } = inject('tema')
```

### Pinia — Gestión de Estado Global

Pinia es el store oficial de Vue 3. Reemplaza a Vuex con una API más simple y soporte completo de TypeScript.

```javascript
// stores/usuario.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUsuarioStore = defineStore('usuario', () => {
  // State
  const usuario = ref(null)
  const token = ref(localStorage.getItem('token'))

  // Getters
  const estaAutenticado = computed(() => !!token.value)
  const nombreCompleto = computed(() =>
    usuario.value ? `${usuario.value.nombre} ${usuario.value.apellido}` : ''
  )

  // Actions
  const login = async (credenciales) => {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credenciales)
    })
    const data = await respuesta.json()
    token.value = data.token
    usuario.value = data.usuario
    localStorage.setItem('token', data.token)
  }

  const logout = () => {
    usuario.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  return { usuario, token, estaAutenticado, nombreCompleto, login, logout }
})

// Uso en componente
const usuarioStore = useUsuarioStore()
await usuarioStore.login({ email: 'ana@ejemplo.com', password: '12345678' })
console.log(usuarioStore.estaAutenticado) // true
```

---

## Vue Router — Enrutamiento

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useUsuarioStore } from '@/stores/usuario'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Inicio.vue') // Lazy loading
    },
    {
      path: '/dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiereAuth: true }
    },
    {
      path: '/usuario/:id',
      component: () => import('@/views/PerfilUsuario.vue'),
      props: true // Pasa :id como prop al componente
    },
    {
      path: '/:pathMatch(.*)*', // 404
      component: () => import('@/views/NoEncontrado.vue')
    }
  ]
})

// Guard de navegación
router.beforeEach((to, from) => {
  const store = useUsuarioStore()
  if (to.meta.requiereAuth && !store.estaAutenticado) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

export default router
```

```vue
<!-- Navegación en componentes -->
<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Leer parámetros
console.log(route.params.id)
console.log(route.query.page)

// Navegar programáticamente
const irAlPerfil = (id) => {
  router.push({ name: 'perfil', params: { id } })
}
</script>

<template>
  <RouterLink to="/dashboard">Dashboard</RouterLink>
  <RouterView /> <!-- Aquí se renderiza la vista activa -->
</template>
```

---

## Performance y Optimización

### v-memo y v-once

```vue
<!-- v-once: renderiza solo una vez, no se actualiza -->
<h1 v-once>{{ titulo }}</h1>

<!-- v-memo: re-renderiza solo si las dependencias cambian -->
<div v-for="item in lista" :key="item.id" v-memo="[item.activo]">
  <!-- Se re-renderiza solo si item.activo cambia -->
  <ComponentePesado :item="item" />
</div>
```

### defineAsyncComponent — Carga perezosa de componentes

```javascript
import { defineAsyncComponent } from 'vue'

const ModalPesado = defineAsyncComponent({
  loader: () => import('./ModalPesado.vue'),
  loadingComponent: Spinner,
  errorComponent: ErrorFallback,
  delay: 200,    // Mostrar loading después de 200ms
  timeout: 3000  // Error si tarda más de 3s
})
```

### Patrón de componentes: Props vs Slots vs Renderless

```vue
<!-- Componente renderless: lógica sin UI -->
<script setup>
// useMousePosition.js — composable equivalente
import { ref, onMounted, onUnmounted } from 'vue'

export function useMousePosition() {
  const x = ref(0)
  const y = ref(0)

  const actualizar = (e) => { x.value = e.clientX; y.value = e.clientY }
  onMounted(() => window.addEventListener('mousemove', actualizar))
  onUnmounted(() => window.removeEventListener('mousemove', actualizar))

  return { x, y }
}
</script>
```

---

## Errores Comunes y Anti-Patrones en Vue

### Error 1: Mutar props directamente

```javascript
// ❌ MAL - mutar prop directamente
const props = defineProps(['valor'])
props.valor = 'nuevo' // Vue warning + comportamiento impredecible

// ✅ BIEN - emitir evento para que el padre actualice
const emit = defineEmits(['update:valor'])
emit('update:valor', 'nuevo')

// ✅ O usar v-model con defineModel (Vue 3.4+)
const modelo = defineModel()
modelo.value = 'nuevo'
```

### Error 2: Perder reactividad con destructuring de reactive

```javascript
// ❌ MAL - se pierde la reactividad
const { nombre, edad } = reactive({ nombre: 'Ana', edad: 28 })
// nombre y edad son strings normales, no reactivos

// ✅ BIEN - usar toRefs para mantener reactividad
import { toRefs } from 'vue'
const estado = reactive({ nombre: 'Ana', edad: 28 })
const { nombre, edad } = toRefs(estado)
// Ahora nombre.value y edad.value son reactivos
```

### Error 3: No limpiar efectos secundarios

```javascript
// ❌ MAL - event listener nunca se elimina (memory leak)
onMounted(() => {
  window.addEventListener('resize', manejarResize)
})

// ✅ BIEN - siempre limpiar en onBeforeUnmount
onMounted(() => {
  window.addEventListener('resize', manejarResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', manejarResize)
})
```

### Error 4: Usar index como key en v-for con listas dinámicas

```vue
<!-- ❌ MAL - index como key causa bugs con listas que cambian -->
<li v-for="(item, index) in items" :key="index">

<!-- ✅ BIEN - usar id único estable -->
<li v-for="item in items" :key="item.id">
```

---

## Preguntas frecuentes de entrevista Vue.js

**¿Cuándo usarías `ref` vs `reactive`?**
`ref` para valores primitivos y cuando necesitas reasignar el valor completo. `reactive` para objetos con múltiples propiedades relacionadas. La regla práctica: si usas `.value` constantemente para un objeto con muchas propiedades, considera `reactive`.

**¿Qué es un composable y cómo difiere de un mixin?**
Un composable es una función que usa la Composition API para encapsular lógica reutilizable con estado. A diferencia de los mixins, los composables no tienen conflictos de nomenclatura, su origen es explícito (sabes de dónde viene cada variable), y pueden recibir argumentos reactivos.

**¿Cuál es la diferencia entre `watch` y `watchEffect`?**
`watch` observa fuentes específicas y da acceso al valor anterior. `watchEffect` rastrea automáticamente todas las dependencias reactivas accedidas en su callback y se ejecuta inmediatamente. Usa `watch` cuando necesitas el valor anterior o control sobre qué observar. Usa `watchEffect` para efectos secundarios que deben ejecutarse cuando cambia cualquier dependencia.

**¿Cómo funciona el sistema de reactividad internamente en Vue 3?**
Vue 3 usa `Proxy` de JavaScript para interceptar acceso y mutaciones a propiedades. Cuando accedes a una propiedad reactiva dentro de un efecto (computed, watch, template render), Vue registra esa dependencia. Cuando la propiedad cambia, Vue notifica a todos los efectos que dependen de ella para que se re-ejecuten.

**¿Qué es Pinia y por qué reemplazó a Vuex?**
Pinia es el gestor de estado oficial de Vue 3. Reemplazó a Vuex porque tiene una API más simple (sin mutations), soporte nativo de TypeScript, DevTools integrado, y stores modulares por defecto. Además soporta tanto la Options API como la Composition API.