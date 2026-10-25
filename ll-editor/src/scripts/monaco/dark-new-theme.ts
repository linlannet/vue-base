// @ts-nocheck
// 对齐官方 magic-api 2.1.1 内置主题 dark-new（内部代号 as）：深色配色（较 dark 对比度更高）。
// 官方 2.x 主题改用 main-* / *-color 等新变量命名，这里按其取值映射到 ll-editor 的旧版变量命名。
import darkTheme from './dark-theme';

export default {
    editor: darkTheme.editor,
    styles: {
        // main-* 基础色
        'background': '#3C3F41',
        'border-color': '#515151',
        'color': '#bbb',
        'selected-background': '#27292A',
        'hover-background': '#353739',
        'selected-color': '#fff',
        'icon-color': '#AFB1B3',
        // 顶栏
        'header-title-color': '#bbb',
        'header-version-color': '#999',
        'header-default-color': '#AFB1B3',
        // main-hover-icon-background-color
        'button-hover-background': '#4C5052',
        // button-disabled-color
        'button-disabled-background': '#5A5A5A',
        // 中部编辑区（官方无对应变量，沿用 dark 的取值）
        'middle-background': '#313335',
        'middle-border': '#323232',
        // 左侧资源树（toolbox-* / navbar-body-* / tree-hover-background-color）
        'toolbox-background': '#3C3F41',
        'toolbox-border-color': '#323232',
        'toolbox-list-label-color': '#bbb',
        'toolbox-list-span-color': '#787878',
        'toolbox-list-hover-background': '#0D293E',
        'toolbox-border-right-color': '#555555',
        'toolbox-list-header-icon-color': '#AFB1B3',
        // 底部 / 状态条边框
        'footer-border-color': '#323232',
        'tab-bar-border-color': '#323232',
        // 输入
        'input-border-color': '#646464',
        'input-border-foucs-color': '#3D6185',
        'input-background': '#45494A',
        // 空态
        'empty-background': '#282828',
        'empty-key-color': '#489DF6',
        'empty-color': '#A0A0A0',
        // 对话框
        'dialog-border-color': '#282828',
        'dialog-shadow-color': '#151515',
        'dialog-button-background': '#4C5052',
        'dialog-button-border': '#5E6060',
        'dialog-button-hover-background': '#365880',
        'dialog-button-hover-border-color': '#43688C',
        // 表格 / 调试
        'table-col-border-color': '#333638',
        'table-row-border-color': '#333638',
        'table-hover-background': '#4B6EAF',
        'table-even-background': '#414547',
        'debug-line-background': '#2D6099',
        'breakpoints-background': '#C75450',
        'breakpoint-line-background': '#3a2323',
        // 下拉
        'select-background': '#3C3F41',
        'select-hover-background': '#3C3F41',
        'select-option-background': '#3C3F41',
        'select-option-hover-background': '#4B6EAF',
        'select-inputable-background': '#45494a',
        'select-inputable-border': 'transparent',
        // 复选框
        'checkbox-background': '#43494A',
        'checkbox-border': '#6B6B6B',
        'checkbox-text-color': '#bbb',
        'checkbox-selected-background': '#43494A',
        'checkbox-selected-border': '#6B6B6B',
        // 文本 / 提示
        'todo-color': '#A8C023',
        'log-error-color': '#CC666E',
        'text-string-color': '#6A8759',
        'text-number-color': '#6897BB',
        'text-boolean-color': '#CC7832',
        'text-property-color': '#9876aa',
        'text-key-color': '#9876aa',
        'suggest-hover-background': '#113A5C',
        'suggest-hover-color': '#fff',
        'statusbar-em-color': '#68dd9a',
        // 日志
        'run-log-background': '#2b2b2b',
        'log-level-info': '#ABC023',
        'log-level-error': '#CC666E',
        'log-level-debug': '#299999',
        'log-level-warn': 'unset',
        'log-level-trace': '#5394EC',
        'log-color-cyan': '#009191',
        'log-color-link': '#287BDE'
    }
};
