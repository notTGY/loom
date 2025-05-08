import { pipeline } from '@huggingface/transformers'


let detector
pipeline(
  'object-detection',
  'Xenova/detr-resnet-50',
  {
    dtype: 'fp16',
  },
).then((d) => {
  detector = d
  self.postMessage({status: 'ready'})
})


self.addEventListener('message', async (event) => {
  const img = event.data.img
  const output = await detector(img, { threshold: 0.9})
  self.postMessage({
    status: 'complete',
    output,
  })
})
