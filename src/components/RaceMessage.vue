<template>
  <div class="race-message">
    <div class="race-message-title">
      <span v-html="racemsg.title"/>
    </div>
    <div class="race-message-datetime">
        {{ racemsg.last_updated }}
    </div>
    <div class="race-message-msg">
      <span v-html="racemsg.message"/>
    </div>
  </div>
</template>

<script>

export default {
  name: 'RaceMessage',
  props: {
    racemsg: {
      type: Object,
      required: true,
    },
  },

  data () {
    return {}
  },
}
</script>

<style scoped>
.race-message {
  text-align: left;
  border-bottom: solid 1px;
}
.race-message:last-child {
  border-bottom: 0px;
}
.race-message-title {
  font-size: 14px;
  font-weight: bold;
}
.race-message-datetime {
  font-size: 12px;
}
.race-message-msg {
  padding: 2px;
  padding-bottom: 5px;
  border-bottom: 1px;
  font-size: 11px;
}
</style>
