# 安安 · 独居老人生活事务提醒与家人协作 —— 演示前端
# 纯静态站点（无构建步骤、无后端、无数据库、无真实 AI 调用）
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="anan-elder-assistant-prototype" \
      org.opencontainers.image.description="面向老年人的 AI 日常事务与家庭协作助手 —— 可操作原型（静态）"

# 站点配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 静态资源（源码即交付物，无编译）
COPY index.html /usr/share/nginx/html/index.html
COPY css/       /usr/share/nginx/html/css/
COPY js/        /usr/share/nginx/html/js/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
