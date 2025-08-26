#include <jsbind/jsbind.hpp>
#include <webbind/webbind.hpp>
#include <stdio.h>
#include <stdint.h>
#include "app.h"

using jsbind::Function;
using namespace webbind;

extern "C" uint32_t exports_my_app_iface_start(app_list_string_t *args) {
    emlite::init();
    AudioContext context;
    OscillatorNode oscillator(context);
    oscillator.type(OscillatorType::TRIANGLE);
    oscillator.frequency().value(261.63); // Middle C

    auto document = window().document();
    auto body =
        document.getElementsByTagName("body").item(0);
    auto button = document.createElement("BUTTON");
    button.textContent("Click me");
    printf("%s\n", button.textContent().c_str().get());
    // button.addEventListener(
    //     "click",
    //     Function::Fn<void(PointerEvent)>([=](auto /*p*/) {
    //         printf("Playing audio\n");
    //         auto os = oscillator.clone();
    //         os.connect(context.destination().as<AudioParam>(
    //         ));
    //         os.start(0.0);
    //     })
    // );
    body.appendChild(button);
    return 0;
}