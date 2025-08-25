#include <jsbind/jsbind.hpp>
#include <webbind/webbind.hpp>
#include <stdio.h>

using jsbind::Function;
using namespace webbind;

extern "C" {
    void emlite_env_host_emlite_init_handle_table(void);
    void emlite_init_handle_table(void);
}

EMLITE_USED
static void _emlite_anchor_host_imports(void) {
  // Taking the address forces a relocation on the import.
  // Mark the function 'used' so the TU isn’t dropped.
  (void)&emlite_env_host_emlite_init_handle_table;
}

int main() {
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
    button.addEventListener(
        "click",
        Function::Fn<void(PointerEvent)>([=](auto /*p*/) {
            printf("Playing audio\n");
            auto os = oscillator.clone();
            os.connect(context.destination().as<AudioParam>(
            ));
            os.start(0.0);
        })
    );
    body.appendChild(button);
    return 0;
}
