import React, { createRef, Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  LoaderContainer,
  Paging,
  InlineModal,
  ConfirmModal,
} from '@shoutem/react-web-ui';
import { fetchShortcuts, getShortcuts } from '@shoutem/redux-api-sdk';
import { shouldLoad } from '@shoutem/redux-io';
import autoBindReact from 'auto-bind/react';
import _ from 'lodash';
import { isInitialized, isBusy } from '@shoutem/redux-io/status';
import { loadGroups, getGroups, getRawGroups } from '../../groups';
import { TARGET_TYPES, AUDIENCE_TYPES, DELIVERY_TYPES } from '../const';
import {
  getNotifications,
  getRawNotifications,
  loadNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
} from '../redux';
import { mapViewToModel, mapModelToView } from '../services';
import {
  NotificationsTable,
  NotificationForm,
  NotificationInfoForm,
} from '../components';
import './style.scss';

const DEFAULT_NOTIFICATION = {
  target: TARGET_TYPES.URL,
  audience: AUDIENCE_TYPES.ALL,
  delivery: DELIVERY_TYPES.NOW,
};

class Notifications extends Component {
  constructor(props) {
    super(props);
    autoBindReact(this);

    this.confirmModal = createRef();

    this.state = {
      showNotificationModal: false,
      showNotificationInfoModal: false,
      currentNotification: null,
    };
  }

  componentWillMount() {
    this.checkData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.checkData(nextProps, this.props);
  }

  checkData(nextProps, props = {}) {
    const { appId, fetchShortcuts, loadGroups } = nextProps;

    if (shouldLoad(nextProps, props, 'notifications')) {
      this.handleLoadNotifications(appId, 0);
      loadGroups(appId);
    }

    if (shouldLoad(nextProps, props, 'groups')) {
      loadGroups(appId);
    }

    if (shouldLoad(nextProps, props, 'shortcuts')) {
      fetchShortcuts();
    }
  }

  handleLoadNotifications(appId, offset, limit) {
    const { loadNotifications } = this.props;
    return loadNotifications(appId, offset, limit);
  }

  handleCreateNotificationClick() {
    this.setState({
      currentNotification: null,
      showNotificationModal: true,
      showNotificationInfoModal: false,
    });
  }

  handleHideNotificationModal() {
    this.setState({
      currentNotification: null,
      showNotificationModal: false,
      showNotificationInfoModal: false,
    });
  }

  handleHideNotificationInfoModal() {
    this.setState({
      currentNotification: null,
      showNotificationModal: false,
      showNotificationInfoModal: false,
    });
  }

  handleNextPageClick() {
    const { appId, notifications, rawNotifications } = this.props;

    if (isBusy(notifications)) {
      return;
    }

    const limit = _.get(rawNotifications, 'paging.pageLimit');
    const page = _.get(rawNotifications, 'paging.page', 0);
    const offset = page * limit + limit;

    this.handleLoadNotifications(appId, offset);
  }

  handlePreviousPageClick() {
    const { appId, notifications, rawNotifications } = this.props;

    if (isBusy(notifications)) {
      return;
    }

    const limit = _.get(rawNotifications, 'paging.pageLimit');
    const page = _.get(rawNotifications, 'paging.page', 0);
    const offset = page * limit - limit;

    this.handleLoadNotifications(appId, offset);
  }

  handleEditClick(notification) {
    const view = mapModelToView(notification);

    this.setState({
      currentNotification: view,
      showNotificationModal: true,
    });
  }

  handleInfoClick(notification) {
    const view = mapModelToView(notification);

    this.setState({
      currentNotification: view,
      showNotificationInfoModal: true,
    });
  }

  handleDeleteClick(notification) {
    const { appId, deleteNotification } = this.props;
    const notificationId = _.get(notification, 'id');

    this.confirmModal.current.show({
      title: 'Delete notification',
      message: 'Are you sure you want to delete this notification?',
      confirmLabel: 'Delete',
      confirmBsStyle: 'danger',
      onConfirm: () => deleteNotification(appId, notificationId),
    });
  }

  handleRowClick(row) {
    const active = _.get(row, 'active');

    if (active) {
      return this.handleEditClick(row);
    }

    return this.handleInfoClick(row);
  }

  handleShowAlert(notification) {
    const { showAlert } = this.props;
    const delivery = _.get(notification, 'delivery');

    if (delivery === DELIVERY_TYPES.SCHEDULED) {
      showAlert('Notification scheduled');
      return;
    }

    showAlert('Notification sent');
  }

  async handleFormSubmit(notification) {
    const { appId, createNotification, updateNotification } = this.props;
    const notificationId = _.get(notification, 'id');

    const notificationModel = mapViewToModel(notification);

    if (notificationId) {
      await updateNotification(appId, notificationId, notificationModel);
      this.handleShowAlert(notification);
      return this.handleHideNotificationModal();
    }

    await createNotification(appId, notificationModel);
    this.handleShowAlert(notification);
    return this.handleHideNotificationModal();
  }

  resolveHasNext() {
    const { rawNotifications } = this.props;

    const limit = _.get(rawNotifications, 'paging.pageLimit');
    const notifications = _.get(rawNotifications, 'data', []);

    if (notifications.length >= limit) {
      return true;
    }

    return false;
  }

  resolveHasPrev() {
    const { rawNotifications } = this.props;
    const page = _.get(rawNotifications, 'paging.page', 0);

    return page > 0;
  }

  renderNotificationModal() {
    const { shortcuts, rawGroups } = this.props;
    const { currentNotification } = this.state;

    const groups = _.get(rawGroups, 'data', []);

    const initialValues = currentNotification || DEFAULT_NOTIFICATION;
    const isEdit = !!_.get(currentNotification, 'id');

    const action = isEdit ? 'Edit' : 'New';
    const title = `${action} push notification`;

    return (
      <InlineModal
        className="notifications-page-modal"
        onHide={this.handleHideNotificationModal}
        title={title}
      >
        <NotificationForm
          groups={groups}
          shortcuts={shortcuts}
          onSubmit={this.handleFormSubmit}
          onCancel={this.handleHideNotificationModal}
          initialValues={initialValues}
        />
      </InlineModal>
    );
  }

  renderNotificationInfoModal() {
    const { shortcuts } = this.props;
    const { currentNotification } = this.state;

    return (
      <InlineModal
        className="notifications-page-modal"
        onHide={this.handleHideNotificationModal}
        title="Sent notification info"
      >
        <NotificationInfoForm
          shortcuts={shortcuts}
          notification={currentNotification}
          onCancel={this.handleHideNotificationInfoModal}
        />
      </InlineModal>
    );
  }

  render() {
    const { notifications, rawNotifications } = this.props;
    const { showNotificationModal, showNotificationInfoModal } = this.state;

    const isLoading = !isInitialized(notifications) || isBusy(notifications);
    const data = _.get(rawNotifications, 'data', []);

    return (
      <div className="notifications">
        <LoaderContainer isOverlay isLoading={isLoading}>
          <NotificationsTable
            notifications={data}
            onRowClick={this.handleRowClick}
            onAddClick={this.handleCreateNotificationClick}
            onDeleteClick={this.handleDeleteClick}
            onEditClick={this.handleEditClick}
          />
          <Paging
            ref="paging"
            hasNext={this.resolveHasNext()}
            hasPrevious={this.resolveHasPrev()}
            onNextPageClick={this.handleNextPageClick}
            onPreviousPageClick={this.handlePreviousPageClick}
          />
          {showNotificationModal && this.renderNotificationModal()}
          {showNotificationInfoModal && this.renderNotificationInfoModal()}
        </LoaderContainer>
        <ConfirmModal
          className="settings-page-modal-small"
          ref={this.confirmModal}
        />
      </div>
    );
  }
}

Notifications.propTypes = {
  appId: PropTypes.string,
  notifications: PropTypes.array,
  rawNotifications: PropTypes.object,
  groups: PropTypes.array,
  rawGroups: PropTypes.object,
  shortcuts: PropTypes.array,
  loadNotifications: PropTypes.func,
  createNotification: PropTypes.func,
  updateNotification: PropTypes.func,
  deleteNotification: PropTypes.func,
  loadGroups: PropTypes.func,
  fetchShortcuts: PropTypes.func,
  showAlert: PropTypes.func,
};

function mapStateToProps(state) {
  return {
    notifications: getNotifications(state),
    rawNotifications: getRawNotifications(state),
    groups: getGroups(state),
    rawGroups: getRawGroups(state),
    shortcuts: getShortcuts(state),
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      loadNotifications,
      createNotification,
      updateNotification,
      deleteNotification,
      loadGroups,
      fetchShortcuts,
    },
    dispatch,
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(Notifications);
