/* global Module */

/* Magic Mirror
 * Module: MMM-PIR-Sensor
 *
 * By Paul-Vincent Roll http://paulvincentroll.com
 * MIT Licensed.
 */

Module.register('MMM-PIR-Sensor', {

    /**
     * Default Config
     */
    defaults: {
        sensorGpio:          25,    // This is the GPIO port number, not the header pin number
        relayGpio:           false, // This is the GPIO port number, not the header pin number
        powerSaving:         true,
        relayOnState:        1,
        relayOffState:       0,
        turnOffAfterSeconds: 30,
        debug:               false
    },

    /**
     * Socket Notification Received
     *
     * @param {String}  notification
     * @param {*}       payload
     */
    socketNotificationReceived: function(notification, payload) {
        if (notification === 'USER_PRESENCE') {
            this.sendNotification(notification, payload)
        }
    },

    /**
     * Notification Received from other modules
     *
     * @param {String} notification
     * @param {*}      payload
     */
    notificationReceived: function(notification, payload) {
        if (notification === 'SCREEN_WAKEUP') {
            this.sendNotification(notification, payload)
        }
    },

    /**
     * Module Start
     */
    start: function() {
        if (this.config.relayOnState === 1) {
            this.config.relayOffState = 0;
        } else {
            this.config.relayOffState = 1;
            this.config.relayOnState  = 0;
        }

        this.sendSocketNotification('CONFIG', this.config);
        Log.info('Starting module: ' + this.name);
    }
});
