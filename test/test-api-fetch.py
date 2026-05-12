#!/usr/bin/env python3
"""
bb-browser /api/fetch 端点测试脚本 (Python 版本)

使用方法：
  1. 启动 Chrome 和 daemon: bb-browser daemon start
  2. 运行测试: python test/test-api-fetch.py
"""

import json
import sys
from typing import Optional, Dict, Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

DAEMON_HOST = "127.0.0.1"
DAEMON_PORT = 6666
DAEMON_URL = f"http://{DAEMON_HOST}:{DAEMON_PORT}"


def bb_fetch(
    url: str,
    method: str = "GET",
    body: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    tab_id: Optional[str] = None,
) -> Dict[str, Any]:
    """通过 bb-browser daemon 执行 fetch 请求"""
    payload = {
        "url": url,
        "method": method,
    }

    if body:
        payload["body"] = body
    if headers:
        payload["headers"] = headers
    if tab_id:
        payload["tabId"] = tab_id

    data = json.dumps(payload).encode("utf-8")
    req = Request(
        f"{DAEMON_URL}/api/fetch",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            error_data = json.loads(error_body)
            raise Exception(f"HTTP {e.code}: {error_data.get('error', 'Unknown error')}")
        except json.JSONDecodeError:
            raise Exception(f"HTTP {e.code}: {error_body}")


def check_daemon_status() -> Dict[str, Any]:
    """检查 daemon 状态"""
    req = Request(f"{DAEMON_URL}/status", method="GET")
    with urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def run_tests():
    """运行测试用例"""
    print("🧪 bb-browser /api/fetch 测试 (Python)\n")

    # 测试 1: 检查 daemon 状态
    print("📋 测试 1: 检查 daemon 状态")
    try:
        status = check_daemon_status()
        print(f"✅ Daemon 运行中 (uptime: {status['uptime']}s, CDP: {status['cdpConnected']})")
        print(f"   当前 seq: {status.get('currentSeq')}, tabs: {len(status.get('tabs', []))}\n")
    except Exception as e:
        print(f"❌ Daemon 未运行: {e}")
        print("   请先启动: bb-browser daemon start\n")
        sys.exit(1)

    # 测试 2: 简单 GET 请求
    print("📋 测试 2: GitHub API GET 请求")
    try:
        result = bb_fetch("https://api.github.com/users/octocat")
        body = result["body"]
        print(f"✅ 状态: {result['status']}, 类型: {result['contentType']}")
        print(f"   用户: {body['login']}, 名称: {body['name']}")
        print(f"   仓库数: {body['public_repos']}\n")
    except Exception as e:
        print(f"❌ 失败: {e}\n")

    # 测试 3: JSON 响应解析
    print("📋 测试 3: JSONPlaceholder API")
    try:
        result = bb_fetch("https://jsonplaceholder.typicode.com/posts/1")
        body = result["body"]
        print(f"✅ 状态: {result['status']}")
        print(f"   标题: {body['title']}")
        print(f"   用户ID: {body['userId']}\n")
    except Exception as e:
        print(f"❌ 失败: {e}\n")

    # 测试 4: POST 请求
    print("📋 测试 4: POST 请求")
    try:
        result = bb_fetch(
            "https://jsonplaceholder.typicode.com/posts",
            method="POST",
            body=json.dumps({
                "title": "Test Post",
                "body": "This is a test",
                "userId": 1,
            }),
            headers={"Content-Type": "application/json"},
        )
        print(f"✅ 状态: {result['status']}")
        print(f"   创建的 ID: {result['body']['id']}\n")
    except Exception as e:
        print(f"❌ 失败: {e}\n")

    # 测试 5: 自定义 headers
    print("📋 测试 5: 自定义请求头")
    try:
        result = bb_fetch(
            "https://httpbin.org/headers",
            headers={
                "X-Custom-Header": "bb-browser-test",
                "User-Agent": "bb-browser-api-test/1.0",
            },
        )
        print(f"✅ 状态: {result['status']}")
        headers_str = json.dumps(result["body"]["headers"], indent=2)
        print(f"   请求头已发送: {headers_str[:200]}...\n")
    except Exception as e:
        print(f"❌ 失败: {e}\n")

    # 测试 6: 错误处理 - 无效 URL
    print("📋 测试 6: 错误处理（无效 URL）")
    try:
        bb_fetch("invalid-url")
        print("❌ 应该抛出错误但没有\n")
    except Exception as e:
        print(f"✅ 正确捕获错误: {e}\n")

    # 测试 7: 错误处理 - 缺少 URL
    print("📋 测试 7: 错误处理（缺少 URL）")
    try:
        data = json.dumps({"method": "GET"}).encode("utf-8")
        req = Request(
            f"{DAEMON_URL}/api/fetch",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(req) as response:
            print("❌ 应该返回 400 错误但没有\n")
    except HTTPError as e:
        if e.code == 400:
            print("✅ 正确返回 400 错误\n")
        else:
            print(f"❌ 返回了错误的状态码: {e.code}\n")
    except Exception as e:
        print(f"❌ 失败: {e}\n")

    print("🎉 测试完成！")


if __name__ == "__main__":
    try:
        run_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 测试失败: {e}")
        sys.exit(1)
