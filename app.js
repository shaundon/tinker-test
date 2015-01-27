var Tinkerforge = require('tinkerforge');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/', express.static(__dirname + '/public'));

io.on('connection', function(socket) {
    console.log('User connected.');
});

http.listen(3000, function() {
    console.log('Server started.');
});

var HOST = 'localhost';
var PORT = 4223;
var UID = {
    LIGHT: 'mbL',
    LCD: 'qzP',
    MULTITOUCH: 'pdL'
};

var ipcon = new Tinkerforge.IPConnection(); // Create IP connection
var al = new Tinkerforge.BrickletAmbientLight(UID.LIGHT, ipcon); // Create device object
var lcd = new Tinkerforge.BrickletLCD20x4(UID.LCD, ipcon);
var multitouch = new Tinkerforge.BrickletMultiTouch(UID.MULTITOUCH, ipcon);

ipcon.connect(HOST, PORT,
    function(error) {
        console.log('Error: '+error);
    }
); // Connect to brickd
// Don't use device before ipcon is connected

ipcon.on(Tinkerforge.IPConnection.CALLBACK_CONNECTED,
    function(connectReason) {
        // Set Period for illuminance callback to 1s (1000ms)
        // Note: The illuminance callback is only called every second if the
        // illuminance has changed since the last call!
        al.setIlluminanceCallbackPeriod(1000);

        // Turn on the light.
        lcd.backlightOn();

        multitouch.on(Tinkerforge.BrickletMultiTouch.CALLBACK_TOUCH_STATE,
            function(touchState) {
                var s = '';
                if (touchState & (1 << 12)) {
                    s += 'In proximity, ';
                }
                if((touchState & 0xFFF) === 0) {
                    s += 'No electrodes touched\n';
                }
                else {
                    s += 'Electrodes ';
                    for(var i=0; i<12; i++) {
                        if(touchState & (1 << i)) {
                            s += parseInt(i) + ' ';
                        }
                    }
                    s += 'touched\n';
                }
                io.emit('event', s);
            });
    }
);

// Register position callback
al.on(Tinkerforge.BrickletAmbientLight.CALLBACK_ILLUMINANCE,
    // Callback function for illuminance callback (parameter has unit Lux/10)
    function(illuminance) {
        var output =  +illuminance/10 + ' Lux';
        lcd.writeLine(0, 0, output);
        io.emit('event', output);
    }
);