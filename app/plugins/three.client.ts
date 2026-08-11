import * as THREE from 'three'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      THREE,
    },
  }
})
