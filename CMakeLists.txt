cmake_minimum_required(VERSION 3.20)
project(wasmbind-example)

include(FetchContent)

FetchContent_Declare(
  wasmbind
  GIT_REPOSITORY https://github.com/emlite/wasmbind.git
  GIT_TAG        main
  GIT_SHALLOW    True
)

FetchContent_MakeAvailable(wasmbind)

add_executable(main src/main.cpp)
target_link_libraries(main PRIVATE wasmbind::webbind emcore::component_type)
set_target_properties(main PROPERTIES LINKER_LANGUAGE CXX SUFFIX .wasm LINK_FLAGS "-Wl,--allow-undefined,--strip-all,--export=main")
target_link_options(main PRIVATE -mexec-model=reactor)