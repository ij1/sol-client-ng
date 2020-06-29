<template>
  <popup-window
    class = "quick-help"
    title = "Quick Help"
    :z-index = "1005"
    close-button-label = "Close"
    @close = "doOk"
    v-if = "showHelp"
  >
    <div class = "help-header">
      Map
    </div>

    <div class = "help-content">
      You can pan the map by dragging it with the mouse, and zoom using
      mousewheel, pinch (with a touchscreen) or
      the '+' and '-' buttons in the toolbar to the left. Hold the button
      to continuously zoom. You can see the current map scale in the bottom
      left of the map. Clicking the 'Center Boat' button in the toolbar
      will center
      the map on your boat. Hovering the mouse over another boat will
      display the name of the boat and other information. Moving the mouse
      over the map changes the display in the top right corner. The top
      line of this display shows the coordinates, the middle line is
      the wind data at that location, the bottom line is the distance and
      bearing from your own location.
    </div>

    <div class = "help-header">
      Steering
    </div>

    <div class = "help-content">
      Click the 'Steer' button in the toolbar, and the steer tab
      becomes active (if not already) and you can use the mouse to set
      the direction you want to sail to (the line extending from your boat).
      The heading and true wind angle (TWA) change on the info box next
      to the steering target as you
      move the mouse. When you are happy with the direction, click the mouse
      on the map to fix the current direction on the steer tab input. You
      can choose to sail on a constant heading (COG) or to maintain
      a constant angle to the wind (TWA) by selecting the corresponding
      option on the steer tab. Click 'Set Boat Course' to send to course
      change command
      to the server, to be executed. If you would like the course change
      to occur in the future, check 'Delay for' and enter a value for how
      long you would like the server to wait before making the course change.
      You can set as many 'Delayed Commands' as you wish, by using different
      times to delay the command. These delayed (or future) commands can be
      viewed and edited in the tab with the clock icon.
    </div>

    <div class = "help-header">
      Weather
    </div>

    <div class = "help-content">
      There is a grid of arrows on the map, colour coded as on the Polar
      diagram, which show the direction from which the wind is blowing at
      that location. You can also use the slider to look ahead in time
      to see how the wind will develop. You can also limit how far ahead
      the slider will go and specify the used
      time step when sliding ahead in time, so you can see more detail.
      Use the play icon to see an animation on how the weather develops.
    </div>

    <div class = "help-header">
      Ruler
    </div>

    <div class = "help-content">
      The 'Ruler' button in the toolbar allows you to draw or mark
      lines on the map, and see the direction and distance between
      the end points. You can also draw a 'path' containing more than
      one segment. Click the 'Ruler' button to the left, and
      then click on the map where you would like to start the path,
      and then each point to make a new segment. You can delete
      the previous point(s) by the Backspace key and using the
      'Delete Last' and 'Delete All' buttons.
      To end a path, double click the map.
    </div>

    <div class = "help-header">
      Chat
    </div>

    <div class = "help-content">
      You can chat with other players online by switching to the chat tab,
      with the speech bubble icon. Enter the text you want to send in
      the input box at the bottom, and hit Enter or click Send to send
      the message. New chat from yourself or other players appears at
      the top of the Chat list. If the chat tab is not active and new
      messages have appeared, a small alert icon is shown on the chat
      tab.
    </div>

    <div class = "help-header">
      The Fleet
    </div>

    <div class = "help-content">
      The tab with the podium icon displays a list of every boat in
      the fleet. You can also create your own custom lists containing
      either a specific set of boats, countries or boat types; or all
      boats within a certain
      distance (in NM) from your location. Click the appropriate button
      at the bottom of the Boats tab to create a new list.
      Enter a name for the list, select the boats/countries/boat types
      you want to include in
      the list and click add. When all the boats/countries/boat types
      are listed in
      the right side panel of the popup window, click 'Done'. You can edit
      these lists, either the name or what is contained in them. These Lists
      are saved in your browser, and re-loaded when you open
      it again. When you click 'Dist' enter a distance to filter boats by.
      The list will then contain only those boats within this distance
      from your own boat, updated once per minute.
      You can change the distance by
      clicking 'Edit'. Tip: 5nm is approximately the distance to the horizon.
      You can display only boats from a certain list by checking 'Show only
      boats from this list'.
    </div>

    <div class = "help-header">
      Other
    </div>

    <div class = "help-content">
      On the Misc tab you can access race related information and
      various options
      available in the game client. Click the Settings button to modify
      options.
      Any options you set are saved in your Browser, and will be activated
      next time you
      open a race, or open a different race.
    </div>

    <div class = "help-content">
      For more comprehensive help, see the Official Sailonline Manual,
      found <a href="/wiki/show/Manual/">here</a>.
    </div>

  </popup-window>
</template>

<script>
import { mapState } from 'vuex';
import PopupWindow from './popupwindow.vue';

export default {
  name: 'QuickHelpPopup',
  components: {
    'popup-window': PopupWindow,
  },
  computed: {
    ...mapState({
      showHelp: state => state.ui.showHelp,
    }),
  },
  methods: {
    doOk: function() {
      this.$store.commit('ui/closeQuickHelp');
    },
  },
}
</script>

<style scoped>
.quick-help {
  width: 35%;
}
.help-header {
  font-size: 14px;
  font-weight: bold;
}

.help-content {
  font-size: 12px;
}
</style>
