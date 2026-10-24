// Accumulate deliberate movement instead of reacting to each scroll frame.
export function createReadingNavigation() {
 let lastY=0, direction=0, distance=0, hidden=false
 return {
  reset(y=0){lastY=Math.max(0,y);direction=0;distance=0;hidden=false},
  update(y,{maxScroll=Infinity,locked=false,revealNearTopOnly=false}={}){
   const position=Math.max(0,Math.min(y,Math.max(0,maxScroll)))
   const delta=position-lastY
   lastY=position
   if(locked || position<(revealNearTopOnly ? 120 : 24)){hidden=false;direction=0;distance=0;return hidden}
   if(Math.abs(delta)<1)return hidden
   const nextDirection=Math.sign(delta)
   distance=nextDirection===direction?distance+Math.abs(delta):Math.abs(delta)
   direction=nextDirection
   if(direction>0 && position>120 && distance>=32)hidden=true
   if(direction<0 && distance>=24 && !revealNearTopOnly)hidden=false
   return hidden
  }
 }
}
