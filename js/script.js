// js/common.js
function checkScreenSize() {
    const smallScreenOverlay = document.querySelector('.small-screen-overlay');
    if (!smallScreenOverlay) return; // 避免元素不存在时出错

    const isSmallScreen = window.innerWidth < 768;
    const selectors = [
        '.lang-switch',
        'h1',
        '.status-bar',
        '.progress-container',
        '.canvas-container',
        '.button-container',
        '.container', // 首页容器
        '.projects',  // 首页项目列表
        '.navbar'     // 家课表导航栏
    ];

    if (isSmallScreen) {
        smallScreenOverlay.style.display = 'flex';
        // 隐藏原有内容
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = 'none';
        });
    } else {
        smallScreenOverlay.style.display = 'none';
        // 恢复原有内容显示
        const displayValues = {
            '.lang-switch': 'block',
            'h1': 'block',
            '.status-bar': 'flex',
            '.progress-container': 'block',
            '.canvas-container': 'flex',
            '.button-container': 'block',
            '.container': 'block', // 首页容器默认显示
            '.projects': 'grid',   // 首页项目列表默认布局
            '.navbar': 'flex'      // 家课表导航栏默认布局
        };

        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = displayValues[selector] || 'block';
        });
    }
}

// 初始化检测
document.addEventListener('DOMContentLoaded', () => {
    checkScreenSize();
    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize);
});