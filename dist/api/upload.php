<?php
// 设置响应头，允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 获取 POST 请求体中的 JSON 数据
    $json = file_get_contents('php://input');

    // 将 JSON 数据解码为 PHP 数组
    $data = json_decode($json, true);

    // 检查 JSON 解码是否成功
    if (json_last_error() === JSON_ERROR_NONE) {
        // 计算 JSON 数据的 SHA-256 哈希值
        $hash = hash('sha256', $data['url'] . '$' . $userAgent);
        // numObjects=1234&maxFrames=100&turbo=500&id=windows
        $name = $data['id'] . '_' . $data['type'] . '_' . $data['numObjects'] . '_' . $data['maxFrames'] . '_' . $data['turbo'] . '_' . $hash . '.json';

        // 获取当前 PHP 脚本所在的目录
        $outputDir = '/volume1/web/gl2gpu/api/output';

        // // 创建 output 目录（如果不存在）
        // if (!is_dir($outputDir)) {
        //     mkdir($outputDir, 0777, true);
        // }
        
        // 将 JSON 数据保存到 output 目录中，文件名为哈希值
        $filePath = $outputDir . '/' . $name;

        file_put_contents($filePath, '{"data":' . $json . ",\n" . '"user-agent": "' . $_SERVER['HTTP_USER_AGENT'] . '"}'); // 保存原始 JSON 数据
        
        // 返回成功响应
        echo json_encode(['status' => 'success', 'message' => $hash]);
    } else {
        // 返回错误响应
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    }
} else {
    // 返回错误响应
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
}
