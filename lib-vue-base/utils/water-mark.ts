var markColumnText = function(ctx,text) {
    for (let index = 0; index < 10; index++) {
        ctx.translate(300,0)
        ctx.fillText(text, 0,0)
    }
    ctx.translate(-3150,0)
}
var markRowText = function(ctx,text) {
    for (let index = 0; index < 10; index++) {
        ctx.translate(0,200)
        markColumnText(ctx,text)
    }
}

export function waterMark(text){
    let w = window.innerWidth 
    let h = window.innerHeight 
    
    // 创建canvas html对像
    var canvas = document.createElement('canvas')
    canvas.style = 'position: fixed;left: 0;right: 0;top: 0; bottom: 0;pointer-events: none;z-index:1000'
    canvas.setAttribute('width', w + 'px')
    canvas.setAttribute('height', h + 'px')
    document.body.appendChild(canvas)
    // 绘制
    var ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.translate(0,-h)     //发生位移进行位移的恢复
    ctx.rotate(-Math.PI/6)
    ctx.font = '16px serif'
    ctx.fillStyle = '#ebebeb'
    markRowText(ctx,text)
}