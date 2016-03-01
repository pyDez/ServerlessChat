(function (app) {


    var chatController = function ($scope, $timeout, translationService) {

        window.moz = !!navigator.mozGetUserMedia;

        var cfg = {
            'iceServers': [{
                'url': 'stun:23.21.150.121'
            }]
        };
        var con = {
            'optional': [{
                'DtlsSrtpKeyAgreement': true
            }]
        };

        var sdpConstraints = {
            optional: [],
            mandatory: {
                OfferToReceiveAudio: true, //needed to fire onicecandidate Method
                OfferToReceiveVideo: false
            }
        };

        // Since the same JS file contains code for both sides of the connection,
        // activeDataChannel tracks which of the two possible datachannel variables we're using.
        var activeDataChannel;

        var RTCMultiSession = function (options) {
            return {
                send: function (message) {
                    if (moz && message.file)
                        //not implemented yet
                        console.log('message is a file');
                    else
                        data = JSON.stringify(message);

                    activeDataChannel.send(data);
                }
            };
        };



        //Needed by both offerer and answerer

        function onsignalingstatechange(state) {
            console.info('signaling state change:', state);
        }

        function oniceconnectionstatechange(state) {
            console.info('ice connection state change:', state);
        }

        function onicegatheringstatechange(state) {
            console.info('ice gathering state change:', state);
        }

        function handleOnconnection() {
            console.log('Datachannel connected');
            displayChat('Datachannel connected');

        }



        //Offerer  
        var dataChannelOfferer = null;
        var offerer = new RTCPeerConnection(cfg, con);

        function setupDataChannelOfferer() {
            try {
                dataChannelOfferer = offerer.createDataChannel('test', {
                    reliable: true
                });
                activeDataChannel = dataChannelOfferer;
                console.log('Created datachannel (offerer)');
                dataChannelOfferer.onopen = function (e) {
                    $timeout(function () {
                        console.log('data channel connect');
                        $scope.waitingConnection = false;
                    });
                };
                dataChannelOfferer.onclose = function (e) {
                    $timeout(function () {
                        _closeDataChannels();
                    });
                };
                dataChannelOfferer.onmessage = function (e) {
                    console.log('Got message (offerer)', e.data);
                    if (e.data.size) {
                        //not implemented yet
                        console.log('message is a file');
                    } else {
                        if (e.data.charCodeAt(0) == 2) {
                            // The first message we get from Firefox (but not Chrome)
                            // is literal ASCII 2 and I don't understand why -- if we
                            // leave it in, JSON.parse() will barf.
                            return;
                        }
                        console.log(e);
                        var data = JSON.parse(e.data);
                        if (data.type === 'file') {
                            //not implemented yet
                            console.log('message is a file');
                        } else {
                            displayChat('Other: ' + data.message);
                        }
                    }
                };
            } catch (e) {
                console.warn('No data channel (offerer)', e);

            }
        }



        offerer.onicecandidate = function (e) {
            $timeout(function () {
                console.log('ICE candidate (offerer)', e);
                if (e.candidate === null) {
                    $scope.dataChannel.offer = JSON.stringify(offerer.localDescription);
                }
            });
        };



        offerer.onconnection = handleOnconnection;
        offerer.onsignalingstatechange = onsignalingstatechange;
        offerer.oniceconnectionstatechange = oniceconnectionstatechange;
        offerer.onicegatheringstatechange = onicegatheringstatechange;




        function handleAnswerFromAnswerer(answerDesc) {
            console.log('Received remote answer: ', answerDesc);
            offerer.setRemoteDescription(answerDesc);
        }


        //Answerer

        var answerer = new RTCPeerConnection(cfg, con);
        var dataChannelAnswerer = null;

        answerer.ondatachannel = function (e) {
            var dataChannel = e.channel || e; // Chrome sends event, FF sends raw channel
            console.log('Received datachannel (answerer)', arguments);
            dataChannelAnswerer = dataChannel;
            activeDataChannel = dataChannelAnswerer;
            dataChannelAnswerer.onopen = function (e) {
                $timeout(function () {
                    console.log('data channel connect');
                    $scope.waitingConnection = false;
                });
            };
            dataChannelAnswerer.onclose = function (e) {
                $timeout(function () {
                    _closeDataChannels();
                });
            };
            dataChannelAnswerer.onmessage = function (e) {
                console.log('Got message (answerer)', e.data);
                if (e.data.size) {
                    //not implemented yet
                    console.log('message is a file');
                } else {
                    var data = JSON.parse(e.data);
                    if (data.type === 'file') {
                        //not implemented yet
                        console.log('message is a file');
                    } else {
                        displayChat('Other: ' + data.message);
                    }
                }
            };
        };

        function handleOfferFromOfferer(offerDesc) {
            answerer.setRemoteDescription(offerDesc);
            answerer.createAnswer(function (answerDesc) {
                console.log('Created local answer: ', answerDesc);
                answerer.setLocalDescription(answerDesc);
            },
              function () {
                  console.warn("Couldn't create offer");
              },
              sdpConstraints);
        }
        answerer.onicecandidate = function (e) {
            $scope.$apply(function () {
                console.log('ICE candidate (answerer)', e);
                if (e.candidate === null) {
                    $scope.dataChannel.answer = JSON.stringify(answerer.localDescription);
                }
            });
        };

        answerer.onsignalingstatechange = onsignalingstatechange;
        answerer.oniceconnectionstatechange = oniceconnectionstatechange;
        answerer.onicegatheringstatechange = onicegatheringstatechange;
        answerer.onconnection = handleOnconnection;

        //user Actions

        var _openRoom = function () {
            setupDataChannelOfferer();
            offerer.createOffer(function (desc) {
                offerer.setLocalDescription(desc, function () { }, function () { });
                console.log('created local offer', desc);
            },
              function () {
                  console.warn("Couldn't create offer");
              },
              sdpConstraints);
            $scope.isOfferer = true;
            _nextStep();
        };

        var _joinRoom = function () {
            var offer = $scope.dataChannel.offer;
            var offerDesc = new RTCSessionDescription(JSON.parse(offer));
            console.log('Received remote offer', offerDesc);
            handleOfferFromOfferer(offerDesc);
            _nextStep();
        };

        var _validateConnection = function () {
            var answer = $scope.dataChannel.answer;
            var answerDesc = new RTCSessionDescription(JSON.parse(answer));
            handleAnswerFromAnswerer(answerDesc);
            _nextStep();
        };

        var _sendData = function () {
            if ($scope.dataChannel.message !== '') {
                var channel = new RTCMultiSession();
                displayChat('You: ' + $scope.dataChannel.message);
                channel.send({
                    message: $scope.dataChannel.message
                });
                $scope.dataChannel.message = '';
            }

            return false;
        };

        var _nextStep = function () {
            ++$scope.stepNumber;
        };

        var _closeDataChannels = function () {
            if (offerer.signalingState != "closed")
                offerer.close();
            if (answerer.signalingState != "closed")
                answerer.close();
            dataChannelOfferer = null;
            dataChannelAnswerer = null;
            activeDataChannel = null;
            offerer = new RTCPeerConnection(cfg, con);
            answerer = new RTCPeerConnection(cfg, con);

            $scope.dataChannel = {
                offer: '',
                answer: '',
                message: '',
                chat: ''
            };
            $scope.isOfferer = false;
            $scope.stepNumber = 0;
            $scope.waitingConnection = true;
        };

        //tools

        function displayChat(message) {
            $timeout(function () {
                $scope.dataChannel.chat = getTimestamp() + ' ' + message + '\r' + $scope.dataChannel.chat;
            });
        }

        function getTimestamp() {
            var totalSec = new Date().getTime() / 1000;
            var hours = parseInt(totalSec / 3600) % 24;
            var minutes = parseInt(totalSec / 60) % 60;
            var seconds = parseInt(totalSec % 60);

            var result = (hours < 10 ? '0' + hours : hours) + ':' +
              (minutes < 10 ? '0' + minutes : minutes) + ':' +
              (seconds < 10 ? '0' + seconds : seconds);

            return result;
        }


        // view scope variables

        $scope.validateConnection = _validateConnection;
        $scope.joinRoom = _joinRoom;
        $scope.openRoom = _openRoom;
        $scope.closeRoom = _closeDataChannels;
        $scope.sendData = _sendData;
        $scope.nextStep = _nextStep;
        $scope.dataChannel = {
            offer: '',
            answer: '',
            message: '',
            chat: ''
        };
        $scope.isOfferer = false;
        $scope.stepNumber = 0;
        $scope.waitingConnection = true;
        $scope.translate = translationService;

    };
    app.controller("chatController", ["$scope", "$timeout", "translationService", chatController]);
}(angular.module("luccaApp")));