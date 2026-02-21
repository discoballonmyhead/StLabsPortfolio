export const techConfig = {
    'Flutter': { color: '#02569B', logo: 'flutter' },
    'Dart': { color: '#0175C2', logo: 'dart' },
    'React': { color: '#20232a', logo: 'react', logoColor: '61DAFB' },
    'Phaser': { color: 'rgb(54, 16, 98)', logo: 'phaser', customLogo: '/logos/phaser-planet-web.png' },
    'JavaScript': { color: '#F7DF1E', logo: 'javascript', logoColor: '000000' },
    'Android': { color: '#3DDC84', logo: 'android', logoColor: '000000' },
    'Java': { color: '#ED8B00', logo: 'openjdk' },
    'iOS': { color: '#000000', logo: 'apple' },
    'Xcode': { color: '#1575F9', logo: 'xcode' },
    'Unity': { color: '#100000', logo: 'unity' },
    'C#': { color: '#7B42BC', logo: 'csharp', customLogo: '/logos/uidownload.png' },
    'Unreal Engine': { color: '#313131', logo: 'unrealengine' },
    'C++': { color: '#00599C', logo: 'cplusplus' },
}

export const logoConfig = {
    size: 600,              // px — how large the background logo renders
    opacity: 0.40,          // 0–1, how visible it is (0.08 = subtle background)
    rightOffset: '-80px',   // how far it bleeds off the right edge
    topOffset: '50%',       // vertical position
    translateY: '-50%',     // centers it vertically
    blur: '0px',            // optional: 'blur(1px)' to push it further back
    zIndex: 0,              // behind content
}