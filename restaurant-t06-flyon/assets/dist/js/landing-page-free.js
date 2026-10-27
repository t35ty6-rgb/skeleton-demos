document.addEventListener('DOMContentLoaded', () => {
  function counter(id, start, end, duration, suffix = '') {
    let obj = document.getElementById(id),
      current = start,
      range = end - start,
      increment = end > start ? 1 : -1,
      step = Math.abs(Math.floor(duration / range)),
      timer = setInterval(() => {
        current += increment
        obj.textContent = current + suffix
        if (current == end) {
          clearInterval(timer)
        }
      }, step)
  }

  counter('count1', 0, 10, 2000, '年')
  counter('count2', 0, 40, 2000, '品')
  counter('count3', 0, 3, 2000, '部屋')
  counter('count4', 0, 30, 2000, '名')
})
