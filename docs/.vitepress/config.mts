import { defineConfig } from 'vitepress';

// 导入主题的配置
import { blogTheme } from './blog-theme';

// 自动获取侧边栏
async function getSidebarItems(basePath: string): Promise<any[]> {
    const items = [];
    // 动态导入 fs 模块
    const { readdir } = await import('fs/promises');

    try {
        const files = (await readdir(`./docs${basePath}`))
            .filter(file => file.endsWith('.md') && file !== 'index.md');
        console.log(`Files in ${basePath}:`, files); // 输出文件列表以进行调试

        for (const file of files) {
            const link = `${basePath}${file.replace('.md', '')}`;
            items.push({ text: file.replace('.md', ''), link });

        }
    } catch (error) {
        console.error(`Error reading directory ${basePath}:`, error);
    }
    console.log('打印————————————————',items);
    return items;
}

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default async () => {
    return defineConfig({
        // 忽略死链
        ignoreDeadLinks: true,
        // 继承博客主题(@sugarat/theme)
        extends: blogTheme,
        // 仓库名
        lang: 'zh-cn',
        title: '🐮🐎',
        description: '为学应尽毕生力，攀高须贵少年时',
        lastUpdated: true,
        // 详见：https://vitepress.dev/zh/reference/site-config#head
        head: [
            // 配置网站的图标（显示在浏览器的 tab 上）
            ['link', { rel: 'icon', href: '/assets/img.png' }],
            [
                'link',
                { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-web/style.css' }
            ]
        ],
        themeConfig: {
            // 展示 2,3 级标题在目录中
            outline: {
                level: [2, 3],
                label: '目录'
            },
            // 默认文案修改
            returnToTopLabel: '回到顶部',
            sidebarMenuLabel: '相关文章',
            lastUpdated: {
                Text: '上次更新于'
            },
            // 设置logo
            logo: '/assets/img.png',
            // 导航栏
            nav: [
                { text: 'Home', link: '/' },
                { text: 'GitHub', link: 'https://github.com/chengbocd' },
                { text: 'Go', link: '/go/' },
                { text: 'Kafka', link: '/kafka/' },
                { text: 'MySQL', link: '/mysql/' },
                { text: 'PHP', link: '/php/' },
                { text: 'Redis', link: '/redis/' },
                { text: 'Other', link: '/other/' }
            ],
            // 友链
            socialLinks: [
                {
                    icon: 'github',
                    link: 'https://github.com/chengbocd'
                }
            ],
            // 侧边栏
            sidebar: {
                '/go/': await getSidebarItems('/go/'),
                '/kafka/': await getSidebarItems('/kafka/'),
                '/mysql/': await getSidebarItems('/mysql/'),
                '/php/': await getSidebarItems('/php/'),
                '/redis/': await getSidebarItems('/redis/'),
                '/other/': await getSidebarItems('/other/')
            },
        }
    });
}