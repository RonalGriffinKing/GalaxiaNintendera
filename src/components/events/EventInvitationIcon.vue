<script setup>
defineProps({name:String})
const paths={calendar:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h2m4 0h2m-8 4h2m4 0h2',clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',duration:'M6 2h12M6 22h12M7 2v5l5 5-5 5v5m10-20v5l-5 5 5 5v5',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-9 12a3 3 0 0 0 6 0',arrow:'M4 12h16m-6-6 6 6-6 6',live:'M8 8a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M4 4a12 12 0 0 0 0 16M20 4a12 12 0 0 1 0 16m-6-8a2 2 0 1 1-4 0 2 2 0 0 1 4 0',star:'m12 2 3 6 7 1-5 5 1 8-6-3-6 3 1-8-5-5 7-1Z',play:'m8 4 12 8-12 8Z'}
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]||paths.star"/></svg></template>
