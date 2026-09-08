if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/regis/.gradle/caches/9.3.1/transforms/ee001509c756fc36890d205e1647ed26/workspace/transformed/hermes-android-250829098.0.17-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/regis/.gradle/caches/9.3.1/transforms/ee001509c756fc36890d205e1647ed26/workspace/transformed/hermes-android-250829098.0.17-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

