try {
    console.log('1. Require @expo/metro-config');
    const { getDefaultConfig } = require("@expo/metro-config");

    console.log('2. Require nativewind/metro');
    const { withNativeWind } = require("nativewind/metro");

    console.log('3. Getting default config...');
    const config = getDefaultConfig(__dirname);
    console.log('   - Got config keys:', Object.keys(config));

    console.log('4. Applying withNativeWind...');
    const finalConfig = withNativeWind(config, { input: "./global.css" });
    console.log('   - Success! Final config keys:', Object.keys(finalConfig));

} catch (error) {
    console.error('FAILED:', error);
    if (error.stack) console.error(error.stack);
}
