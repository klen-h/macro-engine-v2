import axios from "axios";
import { CONFIG } from "../config.js";
import fs from 'fs';
import path from 'path';

export async function fetchLevelData(categoryId = 52012) {
    try {
        const { data } = await axios.get(
            `https://mp-api.jin10.com/api/home/item?category_id=${categoryId}&page=1&limit=200&platform=pc`,
            {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'zh-CN,zh;q=0.9',
                    'handleerror': 'true',
                    'origin': 'https://www.jin10.com',
                    'referer': 'https://www.jin10.com/',
                    'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
                    'x-app-id': 'fiXF2nOnDycGutVA',
                    'x-version': '1.0',
                    'cookie': CONFIG.FLASH_COOKIE
                },
                timeout: 30000
            }
        );

        // 确保目录存在
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // 保留写文件（用于调试/备份）
        fs.writeFileSync(
            path.join(dataDir, `levelData_${categoryId}.json`), 
            JSON.stringify(data, null, 2)
        );

        if (!Array.isArray(data.data)) {
            console.error('返回格式异常:', typeof data.data);
            return [];
        }

        // 关键修改：返回原始数据数组，供缓存模块直接使用
        return data.data;

    } catch (error) {
        console.error('❌ levelData 采集失败:', error.response?.status, error.message);
        return [];
    }
}