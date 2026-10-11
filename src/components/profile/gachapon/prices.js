export const DEFAULT_GACHAPON_PRICES=Object.freeze({normal:20,epic:50})
export function validateGachaponPrices(value){
 const prices={normal:Number(value.normal),epic:Number(value.epic)}
 if(!Object.values(prices).every(n=>Number.isSafeInteger(n)&&n>=1&&n<=1000000))throw Error('Cada precio debe ser un entero entre 1 y 1000000 estrellas.')
 return prices
}
