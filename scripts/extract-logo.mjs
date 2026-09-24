import sharp from 'sharp'
import { resolve } from 'node:path'
const input=resolve('public/sarrun-logo-master.png')
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
const {width,height,channels}=info
function extract(radius){
  const count=width*height
  const seed=new Uint8Array(count)
  for(let i=0;i<count;i++){
    const p=i*channels
    if(Math.max(data[p],data[p+1],data[p+2])>7) seed[i]=1
  }
  const mask=new Uint8Array(count)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x
    if(!seed[i])continue
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(dx*dx+dy*dy>radius*radius)continue
      const nx=x+dx,ny=y+dy
      if(nx>=0&&nx<width&&ny>=0&&ny<height)mask[ny*width+nx]=1
    }
  }
  const outside=new Uint8Array(count)
  const queue=new Int32Array(count)
  let head=0,tail=0
  const push=i=>{if(!mask[i]&&!outside[i]){outside[i]=1;queue[tail++]=i}}
  for(let x=0;x<width;x++){push(x);push((height-1)*width+x)}
  for(let y=0;y<height;y++){push(y*width);push(y*width+width-1)}
  while(head<tail){
    const i=queue[head++],x=i%width,y=(i/width)|0
    if(x>0)push(i-1);if(x+1<width)push(i+1);if(y>0)push(i-width);if(y+1<height)push(i+width)
  }
  const out=Buffer.from(data)
  let minX=width,minY=height,maxX=0,maxY=0,opaque=0
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x
    const alpha=outside[i]?0:255
    out[i*channels+3]=alpha
    if(alpha){opaque++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
  }
  return {out,bounds:[minX,minY,maxX,maxY],opaque}
}
for(const radius of [2,3,4]){
  const {out,bounds,opaque}=extract(radius)
  const name=`public/sarrun-logo-exact-r${radius}.png`
  await sharp(out,{raw:{width,height,channels}}).png().toFile(name)
  await sharp({create:{width,height,channels:4,background:'#f6f2e8'}}).composite([{input:name}]).png().toFile(`logo-exact-r${radius}-cream.png`)
  console.log(JSON.stringify({radius,bounds,opaque,name}))
}