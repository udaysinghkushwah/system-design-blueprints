#!/usr/bin/env python3
import os
import sys
import json
import urllib.request

# Configuration
BLOG_FILE = "medium_blog.md"
TAGS = ["system-design", "software-engineering", "aws", "architecture", "web-development"]

def publish():
    # Retrieve the integration token from environment variables or argument
    token = os.environ.get("MEDIUM_TOKEN")
    if not token:
        if len(sys.argv) > 1:
            token = sys.argv[1]
        else:
            print("❌ Error: Medium Integration Token not found!")
            print("Please set the MEDIUM_TOKEN environment variable or pass it as an argument:")
            print("   python3 publish_to_medium.py <YOUR_INTEGRATION_TOKEN>")
            sys.exit(1)

    if not os.path.exists(BLOG_FILE):
        print(f"❌ Error: {BLOG_FILE} file not found in current directory!")
        sys.exit(1)

    # Read the blog markdown content
    with open(BLOG_FILE, "r", encoding="utf-8") as f:
        blog_content = f.read()

    # Step 1: Fetch user profile to get the userId
    print("⏳ Fetching Medium user profile...")
    user_url = "https://api.medium.com/v1/me"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    req = urllib.request.Request(user_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            user_id = res_data["data"]["id"]
            username = res_data["data"]["username"]
            print(f"✅ Authenticated as: {username} (ID: {user_id})")
    except Exception as e:
        print(f"❌ Error authenticating with Medium: {e}")
        sys.exit(1)

    # Step 2: Create a draft post on Medium
    print("⏳ Publishing draft to Medium...")
    post_url = f"https://api.medium.com/v1/users/{user_id}/posts"
    post_data = {
        "title": "Building a Production-Grade Interactive System Design Explorer",
        "contentFormat": "markdown",
        "content": blog_content,
        "publishStatus": "draft",
        "tags": TAGS
    }
    
    jsondata = json.dumps(post_data).encode("utf-8")
    req = urllib.request.Request(post_url, data=jsondata, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            post_url = res_data["data"]["url"]
            print("\n🎉 Success! Your blog draft has been created on Medium!")
            print(f"🔗 View and edit your draft here: {post_url}")
    except Exception as e:
        print(f"❌ Error creating Medium post: {e}")
        sys.exit(1)

if __name__ == "__main__":
    publish()
