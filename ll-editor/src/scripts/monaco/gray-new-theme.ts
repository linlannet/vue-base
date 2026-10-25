// @ts-nocheck
// 对齐官方 magic-api 2.1.1 内置主题 gray-new（内部代号 ts）：浅灰配色。
// 官方 2.x 主题改用 main-* / empty-* 等新变量命名，这里按其取值映射到 ll-editor 的旧版变量命名。
import defaultTheme from './default-theme';

export default {
    editor: defaultTheme.editor,
    styles: {
        // main-background-color / navbar-body-background-color / empty-background-color
        'background': '#F7F8FA',
        'toolbox-background': '#F7F8FA',
        'empty-background': '#F7F8FA',
        // main-selected-background-color
        'selected-background': '#DFE1E5',
        // main-hover-background-color
        'hover-background': '#EBECF0',
        // main-hover-icon-background-color（顶栏图标悬浮）
        'button-hover-background': '#EBECF0',
        // tree-hover-background-color（资源树悬浮）
        'toolbox-list-hover-background': '#CFDEFC',
        // select-option-hover-background-color / select-background-color / select-hover-background-color
        'select-background': '#fff',
        'select-hover-background': '#fff',
        'select-option-hover-background': '#CFDEFC'
    }
};
