pipeline {
  agent any
  options {
    skipDefaultCheckout(true)          // Source is checked out explicitly before deployment.
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 45, unit: 'MINUTES')
  }

  environment {
    DEPLOY_HOST = "${params.DEPLOY_HOST}"
    DEPLOY_USER = "${params.DEPLOY_USER}"
    APP_DIR     = "${params.APP_DIR}"
    SSH_KEY     = '/var/lib/jenkins/.ssh/deploy'
    IMAGE_TAG   = "b${env.BUILD_NUMBER}"
  }

  stages {
    stage('Pull and deploy on target') {
      steps {
        checkout scm
        sh '''
          set -euo pipefail
          case "$DEPLOY_HOST" in
            ""|*[!A-Za-z0-9.-]*) echo "Invalid DEPLOY_HOST" >&2; exit 2 ;;
          esac
          case "$DEPLOY_USER" in
            ""|*[!A-Za-z0-9_-]*) echo "Invalid DEPLOY_USER" >&2; exit 2 ;;
          esac
          case "$APP_DIR" in
            /*) ;;
            *) echo "APP_DIR must be an absolute path" >&2; exit 2 ;;
          esac
          case "$APP_DIR" in
            *[!A-Za-z0-9_./-]*|*..*) echo "Invalid APP_DIR" >&2; exit 2 ;;
          esac
          if [ ! -r "$SSH_KEY" ]; then
            echo "SSH key is missing or unreadable: $SSH_KEY" >&2
            exit 2
          fi

          git archive --format=tar HEAD | gzip -c | \
            ssh -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new \
              -o IdentitiesOnly=yes -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" \
              "mkdir -p '$APP_DIR' && tar -xzf - -C '$APP_DIR' && \
                cd '$APP_DIR' && IMAGE_TAG='$IMAGE_TAG' bash infrastructure/scripts/remote-deploy.sh"
        '''
      }
    }
  }

  post {
    success { echo "Deployed ${IMAGE_TAG} to ${DEPLOY_HOST}" }
    failure { echo 'Deploy failed. Read the log above; the previous version stays running if the health check failed.' }
  }
}
