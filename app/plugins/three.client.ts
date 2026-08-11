import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      THREE,
      EffectComposer,
      RenderPass,
      UnrealBloomPass,
      OutputPass,
      ShaderPass,
    },
  }
})
