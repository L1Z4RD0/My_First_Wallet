<template>
  <div class="avatar-svg-container" :class="['effect-' + config.specialEffect]">
    <svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Cyber Glow -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        <!-- Galaxy Pattern -->
        <pattern id="galaxyPattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="#1a1a2e" />
          <circle cx="10" cy="10" r="1" fill="white" opacity="0.8" />
          <circle cx="30" cy="40" r="1.5" fill="#e94560" opacity="0.6" />
          <circle cx="45" cy="20" r="1" fill="#0f3460" opacity="0.7" />
        </pattern>
      </defs>

      <!-- Background -->
      <circle cx="100" cy="115" r="110" :fill="config.specialEffect === 'galaxy' ? 'url(#galaxyPattern)' : '#f8fafc'" />
      
      <g class="body-movement">
        <!-- Legs -->
        <g class="legs">
          <path :fill="config.pantsColor" d="M78,145 L70,212 Q70,218 80,218 L95,218 L98,145 Z" />
          <path :fill="config.pantsColor" d="M122,145 L130,212 Q130,218 120,218 L105,218 L102,145 Z" />
          <path d="M98,145 L95,218 L105,218 L102,145 Z" fill="rgba(0,0,0,0.08)" />
          
          <!-- Shoes -->
          <path :fill="config.shoesColor" d="M65,218 Q65,208 78,208 L95,208 L95,228 L72,228 Q65,228 65,218 Z" />
          <path :fill="config.shoesColor" d="M135,218 Q135,208 122,208 L105,208 L105,228 L128,228 Q135,228 135,218 Z" />
        </g>

        <!-- Torso -->
        <g class="torso">
          <path :fill="config.shirtColor" d="M55,150 C55,95 70,82 100,82 C130,82 145,95 145,150 L135,160 L65,160 Z" />
          <!-- Special detail for Cyberpunk -->
          <path v-if="config.specialEffect === 'cyberpunk'" d="M60,100 L140,100" stroke="#00f2ff" stroke-width="2" opacity="0.5" filter="url(#glow)" />
          
          <path :fill="config.skinColor" d="M52,110 Q42,130 46,160 Q48,170 58,165 Q65,162 62,145 Z" />
          <path :fill="config.skinColor" d="M148,110 Q158,130 154,160 Q152,170 142,165 Q135,162 138,145 Z" />
          
          <path :fill="config.shirtColor" d="M52,110 Q46,115 48,138 L62,132 Q65,105 52,110 Z" />
          <path :fill="config.shirtColor" d="M148,110 Q154,115 152,138 L138,132 Q135,105 148,110 Z" />
        </g>
      </g>

      <!-- Neck -->
      <path :fill="config.skinColor" d="M92,75 Q100,88 108,75 L108,92 Q100,98 92,92 Z" />

      <!-- Head & Face -->
      <g class="head-movement">
        <path :fill="config.skinColor" d="M100,8 C130,8 142,28 142,55 C142,88 122,100 100,100 C78,100 58,88 58,55 C58,28 70,8 100,8 Z" />
        
        <circle :fill="config.skinColor" cx="58" cy="58" r="8" />
        <circle :fill="config.skinColor" cx="142" cy="58" r="8" />
        
        <path d="M78,44 Q85,40 92,44" stroke="rgba(0,0,0,0.3)" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <path d="M108,44 Q115,40 122,44" stroke="rgba(0,0,0,0.3)" stroke-width="2.5" fill="none" stroke-linecap="round" />

        <g class="eyes">
          <circle cx="85" cy="55" r="5.5" :fill="config.specialEffect === 'cyberpunk' ? '#00f2ff' : 'white'" />
          <circle cx="115" cy="55" r="5.5" :fill="config.specialEffect === 'cyberpunk' ? '#00f2ff' : 'white'" />
          <circle cx="85" cy="55" r="3" fill="#2d3436" />
          <circle cx="115" cy="55" r="3" fill="#2d3436" />
        </g>
        
        <path d="M92,82 Q100,88 108,82" stroke="rgba(0,0,0,0.4)" stroke-width="2.5" fill="none" stroke-linecap="round" />

        <!-- Hair -->
        <g class="hair-group" :fill="config.hairColor">
          <g v-if="config.hairStyle === 'classic'">
            <path d="M58,52 Q58,8 100,8 Q142,8 142,52 Q142,65 125,58 Q115,52 100,58 Q85,52 75,58 Q58,65 58,52 Z" />
          </g>
          <g v-else-if="config.hairStyle === 'spiky'">
            <path d="M58,58 L52,40 L70,48 L80,18 L95,48 L105,12 L120,48 L135,18 L145,48 L152,38 L142,58 Z" />
          </g>
          <g v-else-if="config.hairStyle === 'bob'">
            <path d="M58,58 Q58,8 100,8 Q142,8 142,58 L148,92 L128,82 L100,92 L72,82 L52,92 Z" />
          </g>
          <g v-else-if="config.hairStyle === 'punk'">
            <path d="M88,32 L95,5 L100,18 L105,5 L112,32 L100,50 Z" />
          </g>
        </g>

        <!-- Accessories -->
        <g v-if="config.accessory === 'glasses'">
          <rect x="74" y="48" width="22" height="14" rx="5" stroke="#2d3436" stroke-width="2" fill="rgba(255,255,255,0.25)" />
          <rect x="104" y="48" width="22" height="14" rx="5" stroke="#2d3436" stroke-width="2" fill="rgba(255,255,255,0.25)" />
          <line x1="96" y1="55" x2="104" y2="55" stroke="#2d3436" stroke-width="2" />
        </g>
        <g v-if="config.accessory === 'cap'">
          <path d="M62,42 Q100,8 138,42 L148,55 L138,60 L62,60 Z" :fill="config.shirtColor" />
          <rect x="54" y="58" width="94" height="8" rx="4" :fill="config.shirtColor" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  config: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.avatar-svg-container {
  width: 100%;
  aspect-ratio: 4 / 5;   /* matches SVG viewBox 200×250 exactly */
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 36px;
  overflow: visible;
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
  border: 1px solid #f1f5f9;
  position: relative;
}

svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.06));
}

/* Cyberpunk Effect */
.effect-cyberpunk {
  box-shadow: 0 0 30px rgba(0, 242, 255, 0.4);
  border-color: #00f2ff;
}
.effect-cyberpunk svg {
  filter: drop-shadow(0 0 5px #00f2ff);
}

/* Galaxy Effect */
.effect-galaxy {
  box-shadow: 0 0 40px rgba(233, 69, 96, 0.3);
}

.eyes {
  animation: blink 4s infinite;
}

.body-movement {
  transform-origin: center bottom;
  animation: breathe 3.5s ease-in-out infinite;
}

.head-movement {
  transform-origin: center 80px;
  animation: tilt 5s ease-in-out infinite;
}

@keyframes blink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.015) translateY(-2px); }
}

@keyframes tilt {
  0%, 100% { transform: rotate(-1deg); }
  50% { transform: rotate(1deg); }
}
</style>
